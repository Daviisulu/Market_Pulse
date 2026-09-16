// Logica pura (nessuna dipendenza da DB/rete) per decidere quali Signal
// sono "trending" in un digest — solo questi ricevono una spiegazione
// didattica (costosa in tempo/token) e vengono evidenziati in dashboard.
// Soglie iniziali, da ricalibrare quando si accumula storico reale
// (vedi "Cosa NON è in questa prima versione" in docs/piano-architettura.md).
//
// Le comparazioni tra digest usano quotaAttenzione (menzioni / totale
// articoli del digest), non il conteggio grezzo: le finestre tra un
// digest e l'altro non sono uniformi (08:00/12:00/22:00, vedi
// "Decisione sulla frequenza" in docs/piano-architettura.md), quindi un
// conteggio più alto può significare solo "il digest aveva più
// articoli", non "più attenzione". Il minimo assoluto di menzioni
// resta invece sul conteggio grezzo: risolve un problema diverso (il
// rumore su numeri piccoli), non quello delle finestre non uniformi.

export interface TrendingInput {
  conteggioMenzioni: number;
  quotaAttenzione: number;
  quotaAttenzionePrecedente: number | null;
}

// Un segnale serve un minimo di menzioni assolute per essere
// considerato rilevante, indipendentemente dalla quota — evita che una
// singola menzione in un digest piccolo (quota alta per puro effetto
// di scala) diventi "trending" da sola.
const MIN_MENZIONI_NUOVO_SEGNALE = 3;

// Un segnale già visto è trending se la sua quota di attenzione
// aumenta di almeno il 50% rispetto al digest precedente.
const RAPPORTO_CRESCITA_TRENDING = 1.5;

export function isTrending({
  conteggioMenzioni,
  quotaAttenzione,
  quotaAttenzionePrecedente,
}: TrendingInput): boolean {
  if (conteggioMenzioni < MIN_MENZIONI_NUOVO_SEGNALE) {
    return false;
  }
  if (quotaAttenzionePrecedente === null || quotaAttenzionePrecedente === 0) {
    // Prima comparsa (o precedente a quota 0): il minimo assoluto sopra
    // è già l'unico criterio, non c'è nulla con cui confrontare la quota.
    return true;
  }
  return quotaAttenzione / quotaAttenzionePrecedente >= RAPPORTO_CRESCITA_TRENDING;
}

// Variazione percentuale della quota di attenzione rispetto al digest
// precedente, null se non c'è un digest precedente con cui confrontare
// (prima comparsa del segnale).
export function computeVariazione(
  quotaAttenzione: number,
  quotaAttenzionePrecedente: number | null,
): number | null {
  if (quotaAttenzionePrecedente === null || quotaAttenzionePrecedente === 0) {
    return null;
  }
  return (quotaAttenzione - quotaAttenzionePrecedente) / quotaAttenzionePrecedente;
}
