// Logica di "validazione prospettica" dei segnali trending — NON
// backtesting in senso classico: non possiamo testare contro notizie
// storiche (i feed RSS danno solo l'attualità, nessun archivio del
// passato), quindi non misuriamo "come sarebbe andata sei mesi fa" ma
// "sta andando come il sentiment suggeriva, da quando abbiamo iniziato
// a raccogliere dati reali". Serve tempo che passa, non lavoro in più —
// vedi docs/piano-architettura.md e la discussione del 2026-09-16 in
// docs/idee-indicatori.md (Livello 3).
//
// Scritto ORA (nessun uso reale ancora possibile: servono più digest
// reali di quelli accumulati finora) cosi' la logica e' pronta e
// testata quando c'e' storico su cui applicarla, invece di scriverla
// di corsa più avanti. Nessuna UI la mostra ancora.

export type DirezioneSentiment = "positivo" | "negativo" | "neutro";
export type DirezionePrezzo = "su" | "giù" | "invariato";

const SOGLIA_SENTIMENT_DIREZIONALE = 0.15; // stessa soglia di SignalCard.tsx

export function direzioneSentiment(v: number): DirezioneSentiment {
  if (v > SOGLIA_SENTIMENT_DIREZIONALE) return "positivo";
  if (v < -SOGLIA_SENTIMENT_DIREZIONALE) return "negativo";
  return "neutro";
}

export interface RisultatoValidazione {
  nome: string;
  direzioneSentiment: DirezioneSentiment;
  prezzoAlSegnale: number;
  prezzoSuccessivo: number;
  variazionePercento: number;
  direzionePrezzo: DirezionePrezzo;
  // null quando il sentiment e' neutro: non c'e' una direzione attesa
  // da validare, non e' ne' un successo ne' un fallimento.
  concorde: boolean | null;
}

// Confronta la direzione di UN segnale trending con il prezzo a un
// orizzonte scelto dal chiamante (il primo elemento di
// prezziSuccessivi, gia' filtrato/ordinato per lo stesso asset) — non
// impone un orizzonte fisso: una nota nel vault (Trading/, sentiment
// globale) mostra che lo stesso segnale puo' avere direzione opposta a
// 1-2 mesi rispetto a 6-36 mesi, quindi l'orizzonte va scelto e
// dichiarato esplicitamente da chi chiama, non nascosto in questa
// funzione.
export function validaSegnale(
  segnale: { nome: string; sentimentMedio: number },
  prezzoAlSegnale: number,
  prezziSuccessivi: { prezzoChiusura: number }[],
): RisultatoValidazione | null {
  const successivo = prezziSuccessivi[0];
  if (!successivo || prezzoAlSegnale === 0) return null;

  const variazionePercento =
    (successivo.prezzoChiusura - prezzoAlSegnale) / prezzoAlSegnale;
  const dirPrezzo: DirezionePrezzo =
    variazionePercento > 0 ? "su" : variazionePercento < 0 ? "giù" : "invariato";
  const dirSentiment = direzioneSentiment(segnale.sentimentMedio);

  let concorde: boolean | null;
  if (dirSentiment === "neutro") {
    concorde = null;
  } else if (dirSentiment === "positivo") {
    concorde = dirPrezzo === "su";
  } else {
    concorde = dirPrezzo === "giù";
  }

  return {
    nome: segnale.nome,
    direzioneSentiment: dirSentiment,
    prezzoAlSegnale,
    prezzoSuccessivo: successivo.prezzoChiusura,
    variazionePercento,
    direzionePrezzo: dirPrezzo,
    concorde,
  };
}

// Sotto questo numero di segnali validabili (sentiment non neutro, con
// un prezzo successivo disponibile), il tasso di successo NON va
// mostrato/usato come se dicesse qualcosa — su pochi casi anche un
// processo casuale può sembrare "funzionare". Valore scelto a giudizio
// (non da una fonte), da rivedere: l'obiettivo non è la precisione del
// numero ma impedire di trarre conclusioni da un campione minuscolo,
// lo stesso rischio di multiple testing bias già documentato in
// Trading/ del vault per i backtest di strategie di trading.
export const CAMPIONE_MINIMO_AFFIDABILE = 30;

export interface TassoSuccesso {
  totaleValidabili: number;
  concordi: number;
  tasso: number | null;
  affidabile: boolean;
}

// Aggrega più RisultatoValidazione in un tasso di successo unico —
// esclude i segnali con sentiment neutro (nessuna direzione attesa) dal
// denominatore, non solo dal conteggio dei successi.
export function calcolaTassoSuccesso(risultati: RisultatoValidazione[]): TassoSuccesso {
  const validabili = risultati.filter(
    (r): r is RisultatoValidazione & { concorde: boolean } => r.concorde !== null,
  );
  const concordi = validabili.filter((r) => r.concorde).length;

  return {
    totaleValidabili: validabili.length,
    concordi,
    tasso: validabili.length > 0 ? concordi / validabili.length : null,
    affidabile: validabili.length >= CAMPIONE_MINIMO_AFFIDABILE,
  };
}
