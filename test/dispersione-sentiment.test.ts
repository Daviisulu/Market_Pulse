import { describe, expect, it } from "vitest";
import { calcolaVarianzaSentiment } from "@/lib/dispersione-sentiment";

describe("calcolaVarianzaSentiment", () => {
  it("ritorna 0 per un array vuoto", () => {
    expect(calcolaVarianzaSentiment([])).toBe(0);
  });

  it("ritorna 0 con una sola menzione", () => {
    expect(calcolaVarianzaSentiment([0.7])).toBe(0);
  });

  it("ritorna 0 quando tutte le menzioni hanno lo stesso sentiment", () => {
    // toBeCloseTo, non toBe: la sottrazione in virgola mobile (0.4 - media)
    // su valori identici non dà sempre esattamente 0 (es. 3e-33 invece di 0).
    expect(calcolaVarianzaSentiment([0.4, 0.4, 0.4])).toBeCloseTo(0);
  });

  it("ritorna la varianza massima con menzioni perfettamente contrapposte", () => {
    // media 0, scarti ±1, varianza = (1²+1²)/2 = 1
    expect(calcolaVarianzaSentiment([1, -1])).toBeCloseTo(1);
  });

  it("calcola correttamente la varianza di popolazione su valori misti", () => {
    // media = (0.6+0.2+-0.4)/3 = 0.1333...
    // varianza = media degli scarti al quadrato
    const media = (0.6 + 0.2 - 0.4) / 3;
    const attesa =
      ((0.6 - media) ** 2 + (0.2 - media) ** 2 + (-0.4 - media) ** 2) / 3;
    expect(calcolaVarianzaSentiment([0.6, 0.2, -0.4])).toBeCloseTo(attesa);
  });
});
