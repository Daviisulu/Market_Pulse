import { db } from "../lib/db";
import { MODELS } from "../lib/anthropic";
import type { SignalType } from "../lib/types";
import { log } from "./log";
import { fetchAllNews } from "./sources/news-rss";
import { fetchCryptoPrices, isCryptoAsset } from "./sources/price-crypto";
import { fetchStockPrices } from "./sources/price-stocks";
import { extractSignals } from "./analysis/extract-entities";
import { computeVariazione, isTrending } from "./analysis/trending";
import { explainTrendingSignal } from "./analysis/explain-trending";

// Solo i tipi di Signal per cui ha senso cercare un prezzo (le altre
// categorie — settore, paese, tema — non sono asset quotabili).
const TIPI_CON_PREZZO: SignalType[] = ["asset", "azienda"];

async function run(): Promise<void> {
  log.info("Avvio digest");

  const rawNews = await fetchAllNews();
  if (rawNews.length === 0) {
    log.error("Nessuna notizia raccolta da nessun feed, digest interrotto");
    return;
  }
  log.info(`${rawNews.length} articoli raccolti`);

  const digest = await db.digest.create({
    data: { periodoCoperto: new Date().toISOString().slice(0, 10) },
  });

  const newsItems = await Promise.all(
    rawNews.map((item) => db.newsItem.create({ data: { ...item, digestId: digest.id } })),
  );

  const extracted = await extractSignals(
    newsItems.map((n) => ({ id: n.id, titolo: n.titolo, estratto: n.estratto, fonte: n.fonte })),
  );
  log.info(`${extracted.length} segnali estratti`);

  // Digest precedente (se esiste), per calcolare la variazione di menzioni
  // per lo stesso nome+tipo di segnale.
  const digestPrecedente = await db.digest.findFirst({
    where: { id: { not: digest.id } },
    orderBy: { creatoIl: "desc" },
    include: { signals: true },
  });

  const signalsCreati: {
    id: string;
    tipo: SignalType;
    nome: string;
    conteggioMenzioni: number;
    sentimentMedio: number;
    variazioneRispettoAlDigestPrecedente: number | null;
    trending: boolean;
    newsItemIds: string[];
  }[] = [];

  // Menzioni / totale articoli del digest: rende confrontabile
  // l'attenzione su un segnale tra digest con un numero diverso di
  // articoli (vedi ingestion/analysis/trending.ts).
  for (const e of extracted) {
    const precedente = digestPrecedente?.signals.find(
      (s) => s.nome === e.nome && s.tipo === e.tipo,
    );
    const quotaAttenzione = e.conteggioMenzioni / newsItems.length;
    const quotaAttenzionePrecedente = precedente?.quotaAttenzione ?? null;
    const variazione = computeVariazione(quotaAttenzione, quotaAttenzionePrecedente);
    const trending = isTrending({
      conteggioMenzioni: e.conteggioMenzioni,
      quotaAttenzione,
      quotaAttenzionePrecedente,
    });

    const signal = await db.signal.create({
      data: {
        digestId: digest.id,
        tipo: e.tipo,
        nome: e.nome,
        conteggioMenzioni: e.conteggioMenzioni,
        quotaAttenzione,
        sentimentMedio: e.sentimentMedio,
        variazioneRispettoAlDigestPrecedente: variazione,
        newsItems: { connect: e.newsItemIds.map((id) => ({ id })) },
      },
    });

    signalsCreati.push({
      id: signal.id,
      tipo: e.tipo,
      nome: e.nome,
      conteggioMenzioni: e.conteggioMenzioni,
      sentimentMedio: e.sentimentMedio,
      variazioneRispettoAlDigestPrecedente: variazione,
      trending,
      newsItemIds: e.newsItemIds,
    });
  }

  // Prezzi: instrada per nome verso CoinGecko (crypto) o Yahoo Finance
  // (azioni/indici) — un nome non mappato in nessuna delle due viene
  // semplicemente ignorato (loggato dalle funzioni stesse).
  const nomiConPrezzo = signalsCreati
    .filter((s) => TIPI_CON_PREZZO.includes(s.tipo))
    .map((s) => s.nome);
  const nomiCripto = nomiConPrezzo.filter(isCryptoAsset);
  const nomiAltri = nomiConPrezzo.filter((n) => !isCryptoAsset(n));

  const [prezziCripto, prezziAzioni] = await Promise.all([
    fetchCryptoPrices(nomiCripto),
    fetchStockPrices(nomiAltri),
  ]);

  const prezziPerNome = new Map<
    string,
    { tipo: "crypto" | "azione" | "indice"; ticker: string; prezzo: number }
  >();
  for (const p of prezziCripto) {
    prezziPerNome.set(p.nome, { tipo: "crypto", ticker: p.nome, prezzo: p.prezzoChiusura });
  }
  for (const p of prezziAzioni) {
    prezziPerNome.set(p.nome, { tipo: p.tipo, ticker: p.ticker, prezzo: p.prezzoChiusura });
  }

  for (const signal of signalsCreati) {
    const prezzo = prezziPerNome.get(signal.nome);
    if (!prezzo) continue;
    await db.priceSnapshot.create({
      data: {
        digestId: digest.id,
        signalId: signal.id,
        ticker: prezzo.ticker,
        tipo: prezzo.tipo,
        prezzoChiusura: prezzo.prezzo,
        data: new Date(),
      },
    });
  }
  log.info(`${prezziPerNome.size} prezzi registrati`);

  // Spiegazioni didattiche: solo per i segnali trending, con gli articoli
  // reali da cui è stato estratto il segnale come contesto per Claude.
  const trendingSignals = signalsCreati.filter((s) => s.trending);
  for (const signal of trendingSignals) {
    const articoli = newsItems
      .filter((n) => signal.newsItemIds.includes(n.id))
      .map((n) => ({ titolo: n.titolo, fonte: n.fonte, estratto: n.estratto }));

    const testo = await explainTrendingSignal({
      tipo: signal.tipo,
      nome: signal.nome,
      conteggioMenzioni: signal.conteggioMenzioni,
      sentimentMedio: signal.sentimentMedio,
      variazioneRispettoAlDigestPrecedente: signal.variazioneRispettoAlDigestPrecedente,
      articoli,
    });

    if (testo) {
      await db.explanation.create({
        data: { signalId: signal.id, testo, modelloUsato: MODELS.explanation },
      });
    }
  }

  log.info(
    `Digest completato: ${newsItems.length} articoli, ${signalsCreati.length} segnali, ${trendingSignals.length} trending`,
  );
}

run()
  .catch((err) => {
    log.error(`Digest fallito: ${String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
