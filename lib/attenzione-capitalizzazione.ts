// Rapporto attenzione/capitalizzazione: quanta attenzione mediatica
// (quotaAttenzione) riceve un segnale rispetto al suo peso reale sul
// mercato (marketCap) — un asset piccolo che riceve tanta copertura
// rispetto alla sua capitalizzazione è un segnale diverso da un asset
// già enorme che ne riceve altrettanta in termini assoluti.
//
// Il rapporto grezzo (quotaAttenzione / marketCap) non è leggibile da
// solo: dipende dall'ordine di grandezza della capitalizzazione, che
// varia di più ordini di grandezza da un asset all'altro. Si confrontano
// quindi i segnali tra loro ALL'INTERNO dello stesso digest — unico
// contesto in cui il confronto ha senso, dato che le capitalizzazioni
// assolute di crypto e azioni non sono comparabili 1:1 — rispetto alla
// mediana del gruppo (più robusta della media a un singolo outlier).

export interface SegnaleConCapitalizzazione {
  id: string;
  quotaAttenzione: number;
  marketCap: number;
}

export type LivelloAttenzioneRelativa = "sproporzionata" | "proporzionata" | "sottotono";

// Soglie a giudizio (non da una fonte/convenzione), come per le fasce di
// concentrazione in lib/concentrazione.ts: servono solo a dare
// un'etichetta leggibile, non da citare come valore ufficiale.
const SOGLIA_SPROPORZIONATA = 3; // almeno 3x la mediana del gruppo
const SOGLIA_SOTTOTONO = 1 / 3; // non più di 1/3 della mediana del gruppo

function mediana(valori: number[]): number {
  const ordinati = [...valori].sort((a, b) => a - b);
  const meta = Math.floor(ordinati.length / 2);
  return ordinati.length % 2 === 0
    ? (ordinati[meta - 1] + ordinati[meta]) / 2
    : ordinati[meta];
}

export function calcolaRapportiAttenzioneCapitalizzazione(
  segnali: SegnaleConCapitalizzazione[],
): Map<string, LivelloAttenzioneRelativa> {
  const risultato = new Map<string, LivelloAttenzioneRelativa>();

  // Serve un gruppo di almeno due segnali per poter confrontare —
  // con uno solo non esiste una "mediana del gruppo" di riferimento.
  if (segnali.length < 2) return risultato;

  const rapporti = segnali.map((s) => ({
    id: s.id,
    rapporto: s.quotaAttenzione / s.marketCap,
  }));

  const mediano = mediana(rapporti.map((r) => r.rapporto));
  if (mediano === 0) return risultato;

  for (const { id, rapporto } of rapporti) {
    const relativo = rapporto / mediano;
    if (relativo >= SOGLIA_SPROPORZIONATA) risultato.set(id, "sproporzionata");
    else if (relativo <= SOGLIA_SOTTOTONO) risultato.set(id, "sottotono");
    else risultato.set(id, "proporzionata");
  }

  return risultato;
}
