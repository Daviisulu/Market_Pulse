import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class FakeAnthropic {
    messages = { create: createMock };
  }
  return { default: FakeAnthropic };
});

const { extractSignals } = await import(
  "@/ingestion/analysis/extract-entities"
);

function toolUseResponse(segnali: unknown) {
  return {
    content: [
      { type: "tool_use", id: "x", name: "registra_segnali", input: { segnali } },
    ],
  };
}

describe("extractSignals", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("aggrega conteggio menzioni e sentiment medio, mappando gli indici agli id reali", async () => {
    createMock.mockResolvedValue(
      toolUseResponse([
        {
          tipo: "asset",
          nome: "Bitcoin",
          menzioni: [
            { indiceArticolo: 0, sentiment: 0.6 },
            { indiceArticolo: 2, sentiment: 0.2 },
          ],
        },
      ]),
    );

    const result = await extractSignals([
      { id: "a1", titolo: "T1", estratto: "E1", fonte: "F1" },
      { id: "a2", titolo: "T2", estratto: "E2", fonte: "F1" },
      { id: "a3", titolo: "T3", estratto: "E3", fonte: "F1" },
    ]);

    expect(result).toEqual([
      {
        tipo: "asset",
        nome: "Bitcoin",
        conteggioMenzioni: 2,
        sentimentMedio: 0.4,
        newsItemIds: ["a1", "a3"],
      },
    ]);
  });

  it("scarta segnali con un tipo non valido", async () => {
    createMock.mockResolvedValue(
      toolUseResponse([
        {
          tipo: "colore-preferito",
          nome: "Blu",
          menzioni: [{ indiceArticolo: 0, sentiment: 0 }],
        },
      ]),
    );

    const result = await extractSignals([
      { id: "a1", titolo: "T1", estratto: "E1", fonte: "F1" },
    ]);

    expect(result).toHaveLength(0);
  });

  it("ritorna array vuoto senza chiamare Claude se non ci sono articoli", async () => {
    const result = await extractSignals([]);

    expect(result).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("ritorna array vuoto se la risposta non contiene un blocco tool_use", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "niente tool qui" }],
    });

    const result = await extractSignals([
      { id: "a1", titolo: "T1", estratto: "E1", fonte: "F1" },
    ]);

    expect(result).toEqual([]);
  });
});
