import { describe, expect, it } from "vitest";
import { sintetizzaDigest } from "@/lib/sintesi";

const base = {
  conteggioMenzioni: 5,
  quotaAttenzione: 0.1,
  sentimentMedio: 0,
  primaComparsa: false,
  variazioneRispettoAlDigestPrecedente: null,
};

describe("sintetizzaDigest", () => {
  it("ritorna null per un digest senza segnali", () => {
    expect(sintetizzaDigest([])).toBeNull();
  });

  it("identifica il tema principale per quota di attenzione, non per conteggio grezzo", () => {
    const testo = sintetizzaDigest([
      { ...base, nome: "A", conteggioMenzioni: 20, quotaAttenzione: 0.05 },
      { ...base, nome: "B", conteggioMenzioni: 5, quotaAttenzione: 0.3 },
    ]);

    expect(testo).toContain('"B"');
    expect(testo).not.toMatch(/tema più discusso è "A"/);
  });

  it("calcola il sentiment generale come media pesata per menzioni", () => {
    const testoPositivo = sintetizzaDigest([
      { ...base, nome: "A", conteggioMenzioni: 10, sentimentMedio: 0.8 },
      { ...base, nome: "B", conteggioMenzioni: 1, sentimentMedio: -0.8 },
    ]);
    expect(testoPositivo).toContain("sentiment generale della giornata è positivo");
  });

  it("segnala un solo nuovo segnale al singolare", () => {
    const testo = sintetizzaDigest([
      { ...base, nome: "A", primaComparsa: true },
      { ...base, nome: "B" },
    ]);
    expect(testo).toContain("È comparso per la prima volta: A.");
  });

  it("segnala più nuovi segnali al plurale, con elenco troncato a 3", () => {
    const testo = sintetizzaDigest([
      { ...base, nome: "A", primaComparsa: true },
      { ...base, nome: "B", primaComparsa: true },
      { ...base, nome: "C", primaComparsa: true },
      { ...base, nome: "D", primaComparsa: true },
    ]);
    expect(testo).toContain("Sono comparsi per la prima volta 4 temi: A, B, C, tra gli altri.");
  });

  it("non menziona nuovi segnali se non ce ne sono", () => {
    const testo = sintetizzaDigest([{ ...base, nome: "A" }]);
    expect(testo).not.toContain("comparso");
  });

  it("segnala il maggior mover solo se diverso dal tema principale", () => {
    const testo = sintetizzaDigest([
      { ...base, nome: "A", quotaAttenzione: 0.3, variazioneRispettoAlDigestPrecedente: 0.1 },
      { ...base, nome: "B", quotaAttenzione: 0.05, variazioneRispettoAlDigestPrecedente: 0.9 },
    ]);
    expect(testo).toContain('"B" ha la crescita di attenzione più marcata (+90%');
  });

  it("ignora variazioni negative o nulle nel calcolo del maggior mover", () => {
    const testo = sintetizzaDigest([
      { ...base, nome: "A", quotaAttenzione: 0.3 },
      { ...base, nome: "B", quotaAttenzione: 0.05, variazioneRispettoAlDigestPrecedente: -0.5 },
    ]);
    expect(testo).not.toContain("crescita di attenzione");
  });
});
