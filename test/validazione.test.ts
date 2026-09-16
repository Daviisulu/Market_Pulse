import { describe, expect, it } from "vitest";
import {
  CAMPIONE_MINIMO_AFFIDABILE,
  calcolaTassoSuccesso,
  direzioneSentiment,
  validaSegnale,
  type RisultatoValidazione,
} from "@/lib/validazione";

describe("direzioneSentiment", () => {
  it("classifica sopra +0.15 come positivo", () => {
    expect(direzioneSentiment(0.5)).toBe("positivo");
  });

  it("classifica sotto -0.15 come negativo", () => {
    expect(direzioneSentiment(-0.5)).toBe("negativo");
  });

  it("classifica la fascia intorno a 0 come neutro", () => {
    expect(direzioneSentiment(0.1)).toBe("neutro");
    expect(direzioneSentiment(-0.1)).toBe("neutro");
  });
});

describe("validaSegnale", () => {
  it("è concorde quando sentiment positivo e prezzo sale", () => {
    const risultato = validaSegnale({ nome: "Bitcoin", sentimentMedio: 0.6 }, 100, [
      { prezzoChiusura: 110 },
    ]);
    expect(risultato?.direzionePrezzo).toBe("su");
    expect(risultato?.concorde).toBe(true);
  });

  it("non è concorde quando sentiment positivo ma prezzo scende", () => {
    const risultato = validaSegnale({ nome: "Bitcoin", sentimentMedio: 0.6 }, 100, [
      { prezzoChiusura: 90 },
    ]);
    expect(risultato?.concorde).toBe(false);
  });

  it("è concorde quando sentiment negativo e prezzo scende", () => {
    const risultato = validaSegnale({ nome: "Bitcoin", sentimentMedio: -0.6 }, 100, [
      { prezzoChiusura: 90 },
    ]);
    expect(risultato?.concorde).toBe(true);
  });

  it("ritorna concorde null per sentiment neutro (nessuna direzione da validare)", () => {
    const risultato = validaSegnale({ nome: "Bitcoin", sentimentMedio: 0.05 }, 100, [
      { prezzoChiusura: 110 },
    ]);
    expect(risultato?.concorde).toBeNull();
  });

  it("ritorna null se non c'è un prezzo successivo (non ancora validabile)", () => {
    const risultato = validaSegnale({ nome: "Bitcoin", sentimentMedio: 0.6 }, 100, []);
    expect(risultato).toBeNull();
  });

  it("ritorna null se il prezzo al segnale è 0 (evita divisione per zero)", () => {
    const risultato = validaSegnale({ nome: "Bitcoin", sentimentMedio: 0.6 }, 0, [
      { prezzoChiusura: 10 },
    ]);
    expect(risultato).toBeNull();
  });

  it("usa solo il primo prezzo successivo fornito, l'orizzonte è scelto dal chiamante", () => {
    const risultato = validaSegnale({ nome: "Bitcoin", sentimentMedio: 0.6 }, 100, [
      { prezzoChiusura: 105 },
      { prezzoChiusura: 200 },
    ]);
    expect(risultato?.prezzoSuccessivo).toBe(105);
  });
});

describe("calcolaTassoSuccesso", () => {
  const base = {
    nome: "X",
    direzioneSentiment: "positivo" as const,
    prezzoAlSegnale: 100,
    prezzoSuccessivo: 110,
    variazionePercento: 0.1,
    direzionePrezzo: "su" as const,
  };

  it("calcola il tasso escludendo i segnali con sentiment neutro dal denominatore", () => {
    const risultati: RisultatoValidazione[] = [
      { ...base, concorde: true },
      { ...base, concorde: false },
      { ...base, concorde: null }, // neutro, non deve contare né come successo né nel totale
    ];

    const tasso = calcolaTassoSuccesso(risultati);

    expect(tasso.totaleValidabili).toBe(2);
    expect(tasso.concordi).toBe(1);
    expect(tasso.tasso).toBeCloseTo(0.5);
  });

  it("ritorna tasso null se non ci sono segnali validabili", () => {
    const tasso = calcolaTassoSuccesso([{ ...base, concorde: null }]);
    expect(tasso.tasso).toBeNull();
  });

  it("segnala 'non affidabile' sotto la soglia minima di campione", () => {
    const risultati: RisultatoValidazione[] = Array.from({ length: 5 }, () => ({
      ...base,
      concorde: true,
    }));

    const tasso = calcolaTassoSuccesso(risultati);

    expect(tasso.totaleValidabili).toBe(5);
    expect(tasso.totaleValidabili).toBeLessThan(CAMPIONE_MINIMO_AFFIDABILE);
    expect(tasso.affidabile).toBe(false);
  });

  it("segnala 'affidabile' solo raggiunta la soglia minima di campione", () => {
    const risultati: RisultatoValidazione[] = Array.from(
      { length: CAMPIONE_MINIMO_AFFIDABILE },
      () => ({ ...base, concorde: true }),
    );

    const tasso = calcolaTassoSuccesso(risultati);

    expect(tasso.affidabile).toBe(true);
  });
});
