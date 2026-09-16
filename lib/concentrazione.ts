// Indice di Herfindahl-Hirschman (HHI): quanto poche entità dominano
// l'attenzione totale di un digest vs quanto è distribuita — somma dei
// quadrati delle quote di ciascun segnale sul totale delle menzioni
// del digest (NON sul totale articoli: qui serve la quota rispetto
// alle altre entità, non rispetto al volume di notizie — diverso da
// Signal.quotaAttenzione, usata invece per il trending).
//
// HHI grezzo dipende dal numero di segnali N (il minimo possibile è
// 1/N, con distribuzione perfettamente uniforme): normalizzato
// (HHI - 1/N) / (1 - 1/N) toglie questa dipendenza, va sempre da 0
// (attenzione perfettamente distribuita) a 1 (un solo segnale
// concentra tutto), comparabile tra digest con un numero diverso di
// segnali. Le fasce qualitative sotto sono scelte a giudizio (non da
// una fonte/convenzione regolatoria) — servono solo a dare un'etichetta
// leggibile al numero, non da citare come soglia ufficiale.

export type LivelloConcentrazione = "bassa" | "media" | "alta";

const SOGLIA_MEDIA = 0.3;
const SOGLIA_ALTA = 0.6;

export interface IndiceConcentrazione {
  hhi: number;
  hhiNormalizzato: number | null;
  numeroSegnali: number;
  livello: LivelloConcentrazione | null;
}

export function calcolaConcentrazione(conteggiMenzioni: number[]): IndiceConcentrazione | null {
  const numeroSegnali = conteggiMenzioni.length;
  if (numeroSegnali === 0) return null;

  const totale = conteggiMenzioni.reduce((sum, v) => sum + v, 0);
  if (totale === 0) return null;

  const hhi = conteggiMenzioni.reduce((sum, v) => sum + (v / totale) ** 2, 0);

  // La normalizzazione non è definita con un solo segnale (1/N = 1,
  // denominatore 1-1/N = 0): un digest con un solo segnale è per forza
  // "concentrato al 100%", non serve calcolarlo.
  let hhiNormalizzato: number | null = null;
  let livello: LivelloConcentrazione | null = null;
  if (numeroSegnali > 1) {
    const minimo = 1 / numeroSegnali;
    hhiNormalizzato = (hhi - minimo) / (1 - minimo);
    livello =
      hhiNormalizzato < SOGLIA_MEDIA
        ? "bassa"
        : hhiNormalizzato < SOGLIA_ALTA
          ? "media"
          : "alta";
  }

  return { hhi, hhiNormalizzato, numeroSegnali, livello };
}
