// Dispersione del sentiment all'interno di un Signal: un segnale con
// metà menzioni molto positive e metà molto negative è diverso da uno
// uniformemente neutro, anche se il sentiment medio (Signal.sentimentMedio)
// è identico nei due casi — la media da sola nasconde il disaccordo tra
// le fonti.
//
// Varianza di popolazione (non campionaria: le menzioni raccolte per un
// segnale in un digest SONO tutte le sue menzioni in quel digest, non un
// campione di un insieme più grande) — divide per n, non per n-1.

export function calcolaVarianzaSentiment(sentiments: number[]): number {
  if (sentiments.length === 0) return 0;

  const media = sentiments.reduce((sum, v) => sum + v, 0) / sentiments.length;
  return (
    sentiments.reduce((sum, v) => sum + (v - media) ** 2, 0) / sentiments.length
  );
}
