import { describe, expect, it } from "vitest";
import { isInWatchlist, ordinaConWatchlistInCima } from "@/lib/watchlist";

describe("isInWatchlist", () => {
  it("riconosce un nome nella watchlist", () => {
    expect(isInWatchlist("Bitcoin")).toBe(true);
    expect(isInWatchlist("Nvidia")).toBe(true);
  });

  it("non riconosce un nome fuori dalla watchlist", () => {
    expect(isInWatchlist("Dogecoin")).toBe(false);
  });
});

describe("ordinaConWatchlistInCima", () => {
  it("mette i segnali in watchlist prima degli altri", () => {
    const segnali = [
      { nome: "Dogecoin", conteggioMenzioni: 20 },
      { nome: "Bitcoin", conteggioMenzioni: 5 },
      { nome: "Ethereum", conteggioMenzioni: 3 },
    ];

    const risultato = ordinaConWatchlistInCima(segnali);

    expect(risultato.map((s) => s.nome)).toEqual(["Bitcoin", "Ethereum", "Dogecoin"]);
  });

  it("preserva l'ordine relativo già presente all'interno di ciascun gruppo", () => {
    // Bitcoin ed Ethereum sono entrambi in watchlist: l'ordine tra loro
    // (già per conteggioMenzioni desc, come restituito dalla query
    // Prisma) non deve cambiare.
    const segnali = [
      { nome: "Ethereum", conteggioMenzioni: 10 },
      { nome: "Bitcoin", conteggioMenzioni: 8 },
      { nome: "Dogecoin", conteggioMenzioni: 20 },
    ];

    const risultato = ordinaConWatchlistInCima(segnali);

    expect(risultato.map((s) => s.nome)).toEqual(["Ethereum", "Bitcoin", "Dogecoin"]);
  });

  it("non modifica l'array originale", () => {
    const segnali = [{ nome: "Dogecoin", conteggioMenzioni: 1 }, { nome: "Bitcoin", conteggioMenzioni: 1 }];
    const originale = [...segnali];

    ordinaConWatchlistInCima(segnali);

    expect(segnali).toEqual(originale);
  });
});
