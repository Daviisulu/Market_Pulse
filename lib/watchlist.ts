// Watchlist personale: asset/aziende che restano sempre in cima alla
// dashboard, indipendentemente dal trending del giorno. Lista curata
// modificabile a mano (stesso principio delle mappe ticker/feed RSS
// già in uso) — nessuna migrazione DB richiesta, il confronto è solo
// per nome ed è calcolato a ogni visualizzazione, non salvato: se
// aggiungi un nome qui, torna in cima anche nei digest passati già
// esistenti, non solo in quelli futuri.
//
// Set iniziale: "i principali asset" (richiesta esplicita
// dell'utente, senza preferenze personali specifiche) — le due
// crypto maggiori per capitalizzazione, i tre indici USA di
// riferimento, le tre aziende più grandi per capitalizzazione che
// oggi muovono di più gli indici stessi.
export const WATCHLIST: string[] = [
  "Bitcoin",
  "Ethereum",
  "S&P 500",
  "Nasdaq",
  "Dow Jones",
  "Nvidia",
  "Apple",
  "Microsoft",
];

export function isInWatchlist(nome: string): boolean {
  return WATCHLIST.includes(nome);
}

// Ordina mettendo prima i Signal in watchlist, poi gli altri — si
// affida alla stabilità del sort (garantita in Node/V8) per preservare
// l'ordine di conteggioMenzioni già applicato dalla query Prisma
// all'interno di ciascun gruppo.
export function ordinaConWatchlistInCima<T extends { nome: string }>(signals: T[]): T[] {
  return [...signals].sort((a, b) => {
    const pesoA = isInWatchlist(a.nome) ? 0 : 1;
    const pesoB = isInWatchlist(b.nome) ? 0 : 1;
    return pesoA - pesoB;
  });
}
