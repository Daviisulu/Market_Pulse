// Rapporto crypto vs tradizionale: quanta dell'attenzione del digest
// (in quotaAttenzione — stessa normalizzazione usata per il trending,
// vedi Signal.quotaAttenzione, non il conteggio grezzo) si concentra su
// segnali legati a notizie crypto vs notizie di mercati tradizionali.
//
// Un Signal può essere estratto da articoli di categorie diverse (es.
// "SEC" citata sia da CoinDesk che da CNBC): gli si assegna la categoria
// maggioritaria tra gli articoli da cui è stato estratto, o "mista" in
// caso di parità. Un segnale "misto" non entra né nel numeratore crypto
// né in quello tradizionale — resta conteggiato solo nella quota mista,
// così le tre quote insieme corrispondono all'attenzione totale coperta
// dai segnali visualizzati.

export type CategoriaMercato = "crypto" | "tradizionale";

export interface RapportoCategorie {
  quotaCrypto: number;
  quotaTradizionale: number;
  quotaMista: number;
}

interface SignalConCategorie {
  quotaAttenzione: number;
  newsItems: { categoria: string }[];
}

function categoriaDominante(
  newsItems: { categoria: string }[],
): CategoriaMercato | "mista" | null {
  if (newsItems.length === 0) return null;

  let crypto = 0;
  let tradizionale = 0;
  for (const n of newsItems) {
    if (n.categoria === "crypto") crypto += 1;
    else if (n.categoria === "tradizionale") tradizionale += 1;
  }

  if (crypto === tradizionale) return "mista";
  return crypto > tradizionale ? "crypto" : "tradizionale";
}

export function calcolaRapportoCategorie(
  signals: SignalConCategorie[],
): RapportoCategorie | null {
  if (signals.length === 0) return null;

  let quotaCrypto = 0;
  let quotaTradizionale = 0;
  let quotaMista = 0;

  for (const s of signals) {
    const dominante = categoriaDominante(s.newsItems);
    if (dominante === "crypto") quotaCrypto += s.quotaAttenzione;
    else if (dominante === "tradizionale") quotaTradizionale += s.quotaAttenzione;
    else quotaMista += s.quotaAttenzione;
  }

  return { quotaCrypto, quotaTradizionale, quotaMista };
}
