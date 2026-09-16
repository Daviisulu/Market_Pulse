import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCryptoPrices, isCryptoAsset } from "@/ingestion/sources/price-crypto";

describe("isCryptoAsset", () => {
  it("riconosce un asset nella mappa curata", () => {
    expect(isCryptoAsset("Bitcoin")).toBe(true);
  });

  it("non riconosce un nome fuori dalla mappa curata", () => {
    expect(isCryptoAsset("Nvidia")).toBe(false);
  });
});

describe("fetchCryptoPrices", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mappa i nomi ai prezzi restituiti da CoinGecko", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 65000 }, ethereum: { usd: 3200 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCryptoPrices(["Bitcoin", "Ethereum"]);

    expect(result).toEqual([
      { nome: "Bitcoin", prezzoChiusura: 65000 },
      { nome: "Ethereum", prezzoChiusura: 3200 },
    ]);
  });

  it("ignora i nomi non presenti nella mappa curata senza chiamare l'API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCryptoPrices(["Nvidia"]);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ritorna array vuoto se la risposta HTTP non è ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCryptoPrices(["Bitcoin"]);

    expect(result).toEqual([]);
  });

  it("salta un asset senza prezzo nella risposta invece di lanciare un errore", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCryptoPrices(["Bitcoin"]);

    expect(result).toEqual([]);
  });
});
