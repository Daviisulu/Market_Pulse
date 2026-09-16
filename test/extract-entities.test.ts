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
        // expect.closeTo, non 0.04 esatto: virgola mobile su una
        // sottrazione/potenza non dà sempre lo stesso valore all'ultimo bit.
        sentimentVarianza: expect.closeTo(0.04),
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

  it("ritorna array vuoto senza lanciare se il tool_use non ha il campo segnali (risposta troncata)", async () => {
    createMock.mockResolvedValue({
      stop_reason: "max_tokens",
      content: [{ type: "tool_use", id: "x", name: "registra_segnali", input: {} }],
    });

    const result = await extractSignals([
      { id: "a1", titolo: "T1", estratto: "E1", fonte: "F1" },
    ]);

    expect(result).toEqual([]);
  });

  it("scarta senza lanciare un elemento malformato dentro un array 'segnali' altrimenti valido", async () => {
    // Simula un troncamento a meta' che lascia un ultimo elemento
    // incompleto invece di far mancare "segnali" del tutto: il campo
    // "menzioni" e' assente su un segnale, presente e valido sull'altro.
    createMock.mockResolvedValue(
      toolUseResponse([
        { tipo: "asset", nome: "Bitcoin", menzioni: [{ indiceArticolo: 0, sentiment: 0.5 }] },
        { tipo: "azienda", nome: "Nvidia" },
      ]),
    );

    const result = await extractSignals([
      { id: "a1", titolo: "T1", estratto: "E1", fonte: "F1" },
    ]);

    expect(result).toEqual([
      {
        tipo: "asset",
        nome: "Bitcoin",
        conteggioMenzioni: 1,
        sentimentMedio: 0.5,
        sentimentVarianza: 0,
        newsItemIds: ["a1"],
      },
    ]);
  });

  it("scarta un segnale con un elemento di 'menzioni' senza sentiment numerico", async () => {
    createMock.mockResolvedValue(
      toolUseResponse([
        {
          tipo: "asset",
          nome: "Bitcoin",
          menzioni: [{ indiceArticolo: 0 }],
        },
      ]),
    );

    const result = await extractSignals([
      { id: "a1", titolo: "T1", estratto: "E1", fonte: "F1" },
    ]);

    expect(result).toEqual([]);
  });

  it("calcola una varianza del sentiment alta quando le menzioni sono contrastanti", async () => {
    createMock.mockResolvedValue(
      toolUseResponse([
        {
          tipo: "asset",
          nome: "Bitcoin",
          menzioni: [
            { indiceArticolo: 0, sentiment: 1 },
            { indiceArticolo: 1, sentiment: -1 },
          ],
        },
      ]),
    );

    const result = await extractSignals([
      { id: "a1", titolo: "T1", estratto: "E1", fonte: "F1" },
      { id: "a2", titolo: "T2", estratto: "E2", fonte: "F1" },
    ]);

    expect(result[0].sentimentMedio).toBeCloseTo(0);
    expect(result[0].sentimentVarianza).toBeCloseTo(1);
  });
});
