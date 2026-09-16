import { describe, expect, it } from "vitest";
import { computeVariazione, isTrending } from "@/ingestion/analysis/trending";

describe("isTrending", () => {
  it("è trending un segnale nuovo con almeno 3 menzioni", () => {
    expect(
      isTrending({ conteggioMenzioni: 3, quotaAttenzione: 0.1, quotaAttenzionePrecedente: null }),
    ).toBe(true);
  });

  it("non è trending un segnale nuovo con meno di 3 menzioni", () => {
    expect(
      isTrending({ conteggioMenzioni: 2, quotaAttenzione: 0.5, quotaAttenzionePrecedente: null }),
    ).toBe(false);
  });

  it("è trending un segnale esistente la cui quota di attenzione cresce almeno del 50%", () => {
    // 0.16/0.1 = 1.6, sopra la soglia senza ambiguità di virgola mobile
    // (0.15/0.1 darebbe 1.4999999999999998 in JS, non esattamente 1.5).
    expect(
      isTrending({ conteggioMenzioni: 10, quotaAttenzione: 0.16, quotaAttenzionePrecedente: 0.1 }),
    ).toBe(true);
  });

  it("non è trending un segnale esistente con crescita di quota sotto il 50%", () => {
    expect(
      isTrending({ conteggioMenzioni: 10, quotaAttenzione: 0.12, quotaAttenzionePrecedente: 0.1 }),
    ).toBe(false);
  });

  it("non è trending sotto il minimo assoluto di menzioni anche con una crescita di quota enorme", () => {
    // La quota quintuplica, ma solo 2 menzioni totali: resta rumore.
    expect(
      isTrending({ conteggioMenzioni: 2, quotaAttenzione: 0.5, quotaAttenzionePrecedente: 0.1 }),
    ).toBe(false);
  });

  it("tratta una quota precedente a 0 come un segnale nuovo", () => {
    expect(
      isTrending({ conteggioMenzioni: 3, quotaAttenzione: 0.1, quotaAttenzionePrecedente: 0 }),
    ).toBe(true);
  });

  it("la normalizzazione per quota evita un falso trending quando il digest è solo più grande", () => {
    // Stesso segnale: 2 menzioni in un digest da 10 articoli (quota 0.2),
    // poi 3 menzioni in un digest da 200 articoli (quota 0.015). Il
    // conteggio grezzo cresce (2->3, +50%, avrebbe superato la vecchia
    // soglia), ma la quota di attenzione crolla — non è un vero aumento
    // di attenzione, solo un digest molto più affollato di notizie.
    expect(
      isTrending({
        conteggioMenzioni: 3,
        quotaAttenzione: 3 / 200,
        quotaAttenzionePrecedente: 2 / 10,
      }),
    ).toBe(false);
  });
});

describe("computeVariazione", () => {
  it("calcola la variazione percentuale della quota rispetto al digest precedente", () => {
    expect(computeVariazione(0.15, 0.1)).toBeCloseTo(0.5);
    expect(computeVariazione(0.05, 0.1)).toBeCloseTo(-0.5);
  });

  it("ritorna null senza una quota precedente valida", () => {
    expect(computeVariazione(0.1, null)).toBeNull();
    expect(computeVariazione(0.1, 0)).toBeNull();
  });
});
