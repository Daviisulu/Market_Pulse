import { describe, expect, it } from "vitest";
import { computeVariazione, isTrending } from "@/ingestion/analysis/trending";

describe("isTrending", () => {
  it("è trending un segnale nuovo con almeno 3 menzioni", () => {
    expect(isTrending({ conteggioMenzioni: 3, conteggioMenzioniPrecedente: null })).toBe(true);
  });

  it("non è trending un segnale nuovo con meno di 3 menzioni", () => {
    expect(isTrending({ conteggioMenzioni: 2, conteggioMenzioniPrecedente: null })).toBe(false);
  });

  it("è trending un segnale esistente che cresce almeno del 50%", () => {
    expect(isTrending({ conteggioMenzioni: 15, conteggioMenzioniPrecedente: 10 })).toBe(true);
  });

  it("non è trending un segnale esistente con crescita sotto il 50%", () => {
    expect(isTrending({ conteggioMenzioni: 12, conteggioMenzioniPrecedente: 10 })).toBe(false);
  });

  it("tratta un precedente a 0 menzioni come un segnale nuovo", () => {
    expect(isTrending({ conteggioMenzioni: 3, conteggioMenzioniPrecedente: 0 })).toBe(true);
    expect(isTrending({ conteggioMenzioni: 1, conteggioMenzioniPrecedente: 0 })).toBe(false);
  });
});

describe("computeVariazione", () => {
  it("calcola la variazione percentuale rispetto al digest precedente", () => {
    expect(computeVariazione(15, 10)).toBeCloseTo(0.5);
    expect(computeVariazione(5, 10)).toBeCloseTo(-0.5);
  });

  it("ritorna null senza un digest precedente valido", () => {
    expect(computeVariazione(5, null)).toBeNull();
    expect(computeVariazione(5, 0)).toBeNull();
  });
});
