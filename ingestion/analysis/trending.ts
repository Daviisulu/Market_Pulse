// Logica pura (nessuna dipendenza da DB/rete) per decidere quali Signal
// sono "trending" in un digest — solo questi ricevono una spiegazione
// didattica (costosa in tempo/token) e vengono evidenziati in dashboard.
// Soglie iniziali, da ricalibrare quando si accumula storico reale
// (vedi "Cosa NON è in questa prima versione" in docs/piano-architettura.md).

export interface TrendingInput {
  conteggioMenzioni: number;
  conteggioMenzioniPrecedente: number | null;
}

// Un segnale mai visto prima serve un minimo di menzioni per essere
// considerato rilevante (evita che una singola menzione isolata diventi
// "trending" solo perché non esisteva un digest precedente con cui confrontarla).
const MIN_MENZIONI_NUOVO_SEGNALE = 3;

// Un segnale già visto è trending se le menzioni aumentano di almeno il 50%
// rispetto al digest precedente.
const RAPPORTO_CRESCITA_TRENDING = 1.5;

export function isTrending({
  conteggioMenzioni,
  conteggioMenzioniPrecedente,
}: TrendingInput): boolean {
  if (conteggioMenzioniPrecedente === null || conteggioMenzioniPrecedente === 0) {
    return conteggioMenzioni >= MIN_MENZIONI_NUOVO_SEGNALE;
  }
  // Stesso minimo assoluto anche qui: senza, una crescita da 1 a 2
  // menzioni (rumore) supererebbe la soglia tanto quanto una da 20 a 40
  // (un vero cambiamento di attenzione) — entrambe raddoppiano.
  if (conteggioMenzioni < MIN_MENZIONI_NUOVO_SEGNALE) {
    return false;
  }
  return conteggioMenzioni / conteggioMenzioniPrecedente >= RAPPORTO_CRESCITA_TRENDING;
}

// Variazione percentuale rispetto al digest precedente, null se non c'è un
// digest precedente con cui confrontare (prima comparsa del segnale).
export function computeVariazione(
  conteggioMenzioni: number,
  conteggioMenzioniPrecedente: number | null,
): number | null {
  if (conteggioMenzioniPrecedente === null || conteggioMenzioniPrecedente === 0) {
    return null;
  }
  return (conteggioMenzioni - conteggioMenzioniPrecedente) / conteggioMenzioniPrecedente;
}
