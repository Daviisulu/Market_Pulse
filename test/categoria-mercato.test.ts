import { describe, expect, it } from "vitest";
import { calcolaRapportoCategorie } from "@/lib/categoria-mercato";

describe("calcolaRapportoCategorie", () => {
  it("ritorna null per un digest senza segnali", () => {
    expect(calcolaRapportoCategorie([])).toBeNull();
  });

  it("assegna un segnale ai suoi articoli interamente crypto", () => {
    const risultato = calcolaRapportoCategorie([
      {
        quotaAttenzione: 0.4,
        newsItems: [{ categoria: "crypto" }, { categoria: "crypto" }],
      },
    ]);
    expect(risultato?.quotaCrypto).toBeCloseTo(0.4);
    expect(risultato?.quotaTradizionale).toBe(0);
    expect(risultato?.quotaMista).toBe(0);
  });

  it("assegna un segnale ai suoi articoli interamente tradizionali", () => {
    const risultato = calcolaRapportoCategorie([
      { quotaAttenzione: 0.3, newsItems: [{ categoria: "tradizionale" }] },
    ]);
    expect(risultato?.quotaTradizionale).toBeCloseTo(0.3);
    expect(risultato?.quotaCrypto).toBe(0);
  });

  it("assegna un segnale alla categoria maggioritaria tra i suoi articoli", () => {
    const risultato = calcolaRapportoCategorie([
      {
        quotaAttenzione: 0.5,
        newsItems: [
          { categoria: "crypto" },
          { categoria: "crypto" },
          { categoria: "tradizionale" },
        ],
      },
    ]);
    expect(risultato?.quotaCrypto).toBeCloseTo(0.5);
    expect(risultato?.quotaTradizionale).toBe(0);
  });

  it("un segnale con articoli in parità va nella quota mista", () => {
    const risultato = calcolaRapportoCategorie([
      {
        quotaAttenzione: 0.2,
        newsItems: [{ categoria: "crypto" }, { categoria: "tradizionale" }],
      },
    ]);
    expect(risultato?.quotaMista).toBeCloseTo(0.2);
    expect(risultato?.quotaCrypto).toBe(0);
    expect(risultato?.quotaTradizionale).toBe(0);
  });

  it("somma correttamente più segnali di categorie diverse", () => {
    const risultato = calcolaRapportoCategorie([
      { quotaAttenzione: 0.3, newsItems: [{ categoria: "crypto" }] },
      { quotaAttenzione: 0.2, newsItems: [{ categoria: "crypto" }] },
      { quotaAttenzione: 0.4, newsItems: [{ categoria: "tradizionale" }] },
    ]);
    expect(risultato?.quotaCrypto).toBeCloseTo(0.5);
    expect(risultato?.quotaTradizionale).toBeCloseTo(0.4);
    expect(risultato?.quotaMista).toBe(0);
  });
});
