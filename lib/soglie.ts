import type { SignalType } from "./types";

// Soglie di presentazione condivise tra le pagine della dashboard.
// Valori scelti a giudizio, senza storico reale su cui calibrarli —
// stessa cautela già applicata alle soglie di trending (vedi
// ingestion/analysis/trending.ts e docs/piano-architettura.md).

// Sotto questo numero di Signal, il digest mostra un avviso di "bassa
// attività" invece di sembrare — a torto — un malfunzionamento.
export const SOGLIA_BASSA_ATTIVITA = 5;

// Un Signal con una sola menzione (spesso un caso isolato/rumore, non
// un'entità di cui si "parla" davvero) affolla la dashboard senza
// aggiungere informazione utile: nascosto dalla visualizzazione, ma
// resta salvato nel DB (non è persa, resta disponibile per eventuali
// aggregazioni future — vedi docs/idee-indicatori.md). Distinta dalla
// soglia di trending in ingestion/analysis/trending.ts: quella decide
// chi riceve una spiegazione, questa solo cosa compare in dashboard.
export const SOGLIA_MENZIONI_MINIME_VISUALIZZAZIONE = 2;

// Varianza di popolazione del sentiment (lib/dispersione-sentiment.ts,
// valori dei singoli sentiment in -1..1) sopra cui un Signal è
// etichettato "sentiment contrastante" invece di uniforme — 0.25
// corrisponde a una deviazione standard di 0.5, uno scarto tipico tra
// le menzioni non trascurabile rispetto al range possibile.
export const SOGLIA_SENTIMENT_CONTRASTANTE = 0.25;

// Sotto questa quota di attenzione (menzioni / totale articoli del
// digest), un asset/azienda/tema è probabilmente irrilevante — non si
// applica a settore/paese (TIPI_CON_SOGLIA_QUOTA sotto): sono categorie
// più ampie per natura, dove una quota bassa non significa la stessa
// cosa di un'entità nominata con pochissima attenzione relativa. Come
// SOGLIA_MENZIONI_MINIME_VISUALIZZAZIONE, nasconde dalla dashboard senza
// cancellare dal DB — restano dati disponibili per aggregazioni future.
export const SOGLIA_QUOTA_ATTENZIONE_MINIMA_ENTITA = 0.02;
export const TIPI_CON_SOGLIA_QUOTA: SignalType[] = ["asset", "azienda", "tema"];
