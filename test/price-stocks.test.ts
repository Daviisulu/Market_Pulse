import { beforeEach, describe, expect, it, vi } from "vitest";

const quoteMock = vi.fn();

vi.mock("yahoo-finance2", () => {
  class FakeYahooFinance {
    quote = quoteMock;
  }
  return { default: FakeYahooFinance };
});

const { fetchStockPrices, isStockOrIndex } = await import(
  "@/ingestion/sources/price-stocks"
);

describe("isStockOrIndex", () => {
  it("riconosce un nome nella mappa curata", () => {
    expect(isStockOrIndex("Nvidia")).toBe(true);
    expect(isStockOrIndex("S&P 500")).toBe(true);
  });

  it("non riconosce un nome fuori dalla mappa curata", () => {
    expect(isStockOrIndex("Bitcoin")).toBe(false);
  });
});

describe("fetchStockPrices", () => {
  beforeEach(() => {
    quoteMock.mockReset();
  });

  it("mappa nome, ticker, tipo, prezzo e volume restituiti da Yahoo Finance", async () => {
    quoteMock.mockResolvedValue({ regularMarketPrice: 950.5, regularMarketVolume: 42000000 });

    const result = await fetchStockPrices(["Nvidia"]);

    expect(result).toEqual([
      { nome: "Nvidia", ticker: "NVDA", tipo: "azione", prezzoChiusura: 950.5, volume: 42000000 },
    ]);
  });

  it("usa null come volume se Yahoo Finance non lo restituisce", async () => {
    quoteMock.mockResolvedValue({ regularMarketPrice: 950.5 });

    const result = await fetchStockPrices(["Nvidia"]);

    expect(result).toEqual([
      { nome: "Nvidia", ticker: "NVDA", tipo: "azione", prezzoChiusura: 950.5, volume: null },
    ]);
  });

  it("ignora i nomi non mappati senza interrogare Yahoo Finance", async () => {
    const result = await fetchStockPrices(["Bitcoin"]);

    expect(result).toEqual([]);
    expect(quoteMock).not.toHaveBeenCalled();
  });

  it("continua con gli altri ticker se uno fallisce", async () => {
    quoteMock
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValueOnce({ regularMarketPrice: 190, regularMarketVolume: 1000 });

    const result = await fetchStockPrices(["Nvidia", "Apple"]);

    expect(result).toEqual([
      { nome: "Apple", ticker: "AAPL", tipo: "azione", prezzoChiusura: 190, volume: 1000 },
    ]);
  });

  it("salta un ticker senza prezzo nella risposta", async () => {
    quoteMock.mockResolvedValue({});

    const result = await fetchStockPrices(["Nvidia"]);

    expect(result).toEqual([]);
  });
});
