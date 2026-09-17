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
    process.exitCode = 1;
    return;
  }
  log.info(`${rawNews.length} articoli raccolti dai feed`);

  // I feed RSS mostrano una finestra di "ultimi N articoli", non "nuovi da
  // quando ho controllato l'ultima volta": con 3 run/giorno ravvicinati, la
  // maggior parte di ogni raccolta e' la STESSA notizia gia' vista poche ore
  // prima (verificato il 2026-09-17: 78-89% di sovrapposizione tra digest
  // consecutivi). Senza questo filtro si paga Claude per ri-estrarre segnali
  // gia' estratti, e quotaAttenzione conta piu' volte lo stesso articolo
  // come se fosse attenzione fresca - falsando la metrica di fondo dell'app,
  // non solo sprecando soldi. Scarto per URL invece che per titolo: due
  // fonti diverse possono ripubblicare la stessa notizia con titoli lievemente
  // diversi, ma l'URL originale resta lo stesso strumento affidabile di
  // deduplica gia' garantito dal feed stesso.
  const urlEsistenti = new Set(
    (
      await db.newsItem.findMany({
        where: { url: { in: rawNews.map((n) => n.url) } },
        select: { url: true },
      })
    ).map((n) => n.url),
  );
  const nuoviArticoli = rawNews.filter((n) => !urlEsistenti.has(n.url));
  log.info(
    `${nuoviArticoli.length} articoli nuovi, ${rawNews.length - nuoviArticoli.length} gia' visti in un digest precedente (scartati)`,
  );

  if (nuoviArticoli.length === 0) {
    // Non e' un fallimento: le fonti funzionano, semplicemente non e'
    // uscito nulla di nuovo in questa finestra. Nessun Digest creato (non
    // c'e' nulla da mostrare) e nessun process.exitCode impostato - il
    // task pianificato non deve segnalarlo come un errore.
    log.info("Nessun articolo nuovo rispetto ai digest precedenti: digest saltato per questo ciclo");
    return;
  }

  const digest = await db.digest.create({
    data: { periodoCoperto: new Date().toISOString().slice(0, 10) },
  });

  const newsItems = await Promise.all(
    nuoviArticoli.map((item) => db.newsItem.create({ data: { ...item, digestId: digest.id } })),
  );

  const extracted = await extractSignals(
    newsItems.map((n) => ({ id: n.id, titolo: n.titolo, estratto: n.estratto, fonte: n.fonte })),
  );
  log.info(`${extracted.length} segnali estratti`);

  if (extracted.length === 0) {
    // extractSignals ha gia' loggato il motivo esatto (nessun tool_use,
    // "segnali" mancante/non valido, stop_reason). Senza questo controllo
    // un digest con 0 segnali usciva con codice 0 come un successo -
    // scoperto il 2026-09-16 dopo due run reali troncati che sono
    // sembrati "riusciti" a qualunque controllo basato solo sul codice
    // di uscita. Con questo, il task pianificato puo' segnalare il
    // fallimento invece di restare silenzioso.
    log.error("Nessun segnale estratto da un batch di articoli non vuoto: digest fallito");
    process.exitCode = 1;
    return;
  }

  // Digest precedente (se esiste), per calcolare la variazione di menzioni
  // per lo stesso nome+tipo di segnale.
  const digestPrecedente = await db.digest.findFirst({
    where: { id: { not: digest.id } },
    orderBy: { creatoIl: "desc" },
    include: { signals: true },
  });

  // Tutte le coppie nome+tipo mai comparse in un digest precedente
  // (non solo l'ultimo) — per distinguere una prima comparsa vera da
  // un segnale che torna dopo un'assenza. Una query sola invece di una
  // per segnale.
  const segnaliStorici = await db.signal.findMany({
    where: { digestId: { not: digest.id } },
    select: { nome: true, tipo: true },
    distinct: ["nome", "tipo"],
  });
  const chiaviStoriche = new Set(segnaliStorici.map((s) => `${s.tipo}|${s.nome}`));

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
    const primaComparsa = !chiaviStoriche.has(`${e.tipo}|${e.nome}`);

    const signal = await db.signal.create({
      data: {
        digestId: digest.id,
        tipo: e.tipo,
        nome: e.nome,
        conteggioMenzioni: e.conteggioMenzioni,
        quotaAttenzione,
        sentimentMedio: e.sentimentMedio,
        sentimentVarianza: e.sentimentVarianza,
        variazioneRispettoAlDigestPrecedente: variazione,
        primaComparsa,
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
    {
      tipo: "crypto" | "azione" | "indice";
      ticker: string;
      prezzo: number;
      volume: number | null;
      marketCap: number | null;
    }
  >();
  for (const p of prezziCripto) {
    prezziPerNome.set(p.nome, {
      tipo: "crypto",
      ticker: p.nome,
      prezzo: p.prezzoChiusura,
      volume: p.volume,
      marketCap: p.marketCap,
    });
  }
  for (const p of prezziAzioni) {
    prezziPerNome.set(p.nome, {
      tipo: p.tipo,
      ticker: p.ticker,
      prezzo: p.prezzoChiusura,
      volume: p.volume,
      marketCap: p.marketCap,
    });
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
        volume: prezzo.volume,
        marketCap: prezzo.marketCap,
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
