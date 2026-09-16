import { describe, expect, it } from "vitest";
import { calcolaRollupEntita } from "@/lib/rollup-entita";

describe("calcolaRollupEntita", () => {
  it("ritorna null se non ci sono segnali di tipo settore o paese", () => {
    const risultato = calcolaRollupEntita([
      { tipo: "azienda", nome: "Nvidia", quotaAttenzione: 0.3, sentimentMedio: 0.2 },
      { tipo: "asset", nome: "Bitcoin", quotaAttenzione: 0.4, sentimentMedio: 0.1 },
    ]);
    expect(risultato).toBeNull();
  });

  it("raggruppa e ordina i settori per quotaAttenzione decrescente", () => {
    const risultato = calcolaRollupEntita([
      { tipo: "settore", nome: "Energia", quotaAttenzione: 0.1, sentimentMedio: -0.1 },
      { tipo: "settore", nome: "Tecnologia", quotaAttenzione: 0.3, sentimentMedio: 0.4 },
      { tipo: "azienda", nome: "Nvidia", quotaAttenzione: 0.5, sentimentMedio: 0.2 },
    ]);
    expect(risultato?.settori.map((s) => s.nome)).toEqual(["Tecnologia", "Energia"]);
    expect(risultato?.paesi).toEqual([]);
  });

  it("raggruppa e ordina i paesi separatamente dai settori", () => {
    const risultato = calcolaRollupEntita([
      { tipo: "paese", nome: "Cina", quotaAttenzione: 0.2, sentimentMedio: -0.3 },
      { tipo: "paese", nome: "Stati Uniti", quotaAttenzione: 0.35, sentimentMedio: 0.1 },
      { tipo: "settore", nome: "Bancario", quotaAttenzione: 0.15, sentimentMedio: 0 },
    ]);
    expect(risultato?.paesi.map((p) => p.nome)).toEqual(["Stati Uniti", "Cina"]);
    expect(risultato?.settori.map((s) => s.nome)).toEqual(["Bancario"]);
  });
});
