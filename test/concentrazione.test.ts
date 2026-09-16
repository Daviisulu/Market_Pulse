import { describe, expect, it } from "vitest";
import { calcolaConcentrazione } from "@/lib/concentrazione";

describe("calcolaConcentrazione", () => {
  it("ritorna null per un digest senza segnali", () => {
    expect(calcolaConcentrazione([])).toBeNull();
  });

  it("ritorna null se il totale menzioni è 0", () => {
    expect(calcolaConcentrazione([0, 0])).toBeNull();
  });

  it("con un solo segnale, HHI è 1 e non è normalizzabile", () => {
    const risultato = calcolaConcentrazione([10]);
    expect(risultato?.hhi).toBe(1);
    expect(risultato?.hhiNormalizzato).toBeNull();
    expect(risultato?.livello).toBeNull();
  });

  it("con menzioni distribuite in modo perfettamente uniforme, la concentrazione normalizzata è 0", () => {
    const risultato = calcolaConcentrazione([10, 10, 10, 10]);
    expect(risultato?.hhiNormalizzato).toBeCloseTo(0);
    expect(risultato?.livello).toBe("bassa");
  });

  it("con un segnale che domina quasi tutto, la concentrazione normalizzata è alta", () => {
    const risultato = calcolaConcentrazione([1, 1, 1, 97]);
    expect(risultato?.hhiNormalizzato).toBeGreaterThan(0.6);
    expect(risultato?.livello).toBe("alta");
  });

  it("il calcolo grezzo di HHI è corretto (somma dei quadrati delle quote)", () => {
    // Due segnali a pari menzioni: quota 0.5 ciascuno, HHI = 0.5^2*2 = 0.5
    const risultato = calcolaConcentrazione([5, 5]);
    expect(risultato?.hhi).toBeCloseTo(0.5);
  });
});
