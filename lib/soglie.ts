// Soglie di presentazione condivise tra le pagine della dashboard.
// Valori scelti a giudizio, senza storico reale su cui calibrarli —
// stessa cautela già applicata alle soglie di trending (vedi
// ingestion/analysis/trending.ts e docs/piano-architettura.md).

// Sotto questo numero di Signal, il digest mostra un avviso di "bassa
// attività" invece di sembrare — a torto — un malfunzionamento.
export const SOGLIA_BASSA_ATTIVITA = 5;
