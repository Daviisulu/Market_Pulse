import { describe, expect, it } from "vitest";
import { calcolaRapportiAttenzioneCapitalizzazione } from "@/lib/attenzione-capitalizzazione";

describe("calcolaRapportiAttenzioneCapitalizzazione", () => {
  it("ritorna una mappa vuota con meno di due segnali", () => {
    const risultato = calcolaRapportiAttenzioneCapitalizzazione([
      { id: "a", quotaAttenzione: 0.5, marketCap: 1000 },
    ]);
    expect(risultato.size).toBe(0);
  });

  it("ritorna una mappa vuota se la mediana dei rapporti è 0", () => {
    const risultato = calcolaRapportiAttenzioneCapitalizzazione([
      { id: "a", quotaAttenzione: 0, marketCap: 1000 },
      { id: "b", quotaAttenzione: 0, marketCap: 2000 },
    ]);
    expect(risultato.size).toBe(0);
  });

  it("etichetta come sproporzionato un piccolo asset con molta attenzione", () => {
    // rapporto A: 0.3 / 10 = 0.03, rapporto B: 0.1 / 1000 = 0.0001
    // mediana dei due = (0.03 + 0.0001) / 2 ≈ 0.015 — A è ~2x la mediana
    // (non basta), forziamo con un terzo segnale medio per una mediana
    // rappresentativa del gruppo.
    const risultato = calcolaRapportiAttenzioneCapitalizzazione([
      { id: "grande", quotaAttenzione: 0.1, marketCap: 1_000_000 }, // rapporto 1e-7
      { id: "medio", quotaAttenzione: 0.1, marketCap: 10_000 }, // rapporto 1e-5
      { id: "piccolo-virale", quotaAttenzione: 0.3, marketCap: 1_000 }, // rapporto 3e-4
    ]);
    expect(risultato.get("piccolo-virale")).toBe("sproporzionata");
    expect(risultato.get("grande")).toBe("sottotono");
    expect(risultato.get("medio")).toBe("proporzionata");
  });

  it("segnali con rapporto vicino alla mediana sono proporzionati", () => {
    const risultato = calcolaRapportiAttenzioneCapitalizzazione([
      { id: "a", quotaAttenzione: 0.2, marketCap: 1000 },
      { id: "b", quotaAttenzione: 0.22, marketCap: 1000 },
    ]);
    expect(risultato.get("a")).toBe("proporzionata");
    expect(risultato.get("b")).toBe("proporzionata");
  });
});
