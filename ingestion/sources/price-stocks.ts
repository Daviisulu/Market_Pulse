import YahooFinance from "yahoo-finance2";
import { log } from "../log";
import type { AssetType } from "../../lib/types";

// yahoo-finance2 v4 esporta la classe client, non un'istanza pronta
// all'uso: va istanziata esplicitamente (vedi doc del pacchetto).
const yahooFinance = new YahooFinance();

type StockOrIndexType = Extract<AssetType, "azione" | "indice">;

// Mappa curata nome normalizzato -> ticker Yahoo Finance. Stesso principio
// di CRYPTO_ID_MAP in price-crypto.ts: lista piccola e verificata,
// estendibile quando emerge un nome ricorrente non mappato.
const STOCK_TICKER_MAP: Record<string, { ticker: string; tipo: StockOrIndexType }> = {
  Nvidia: { ticker: "NVDA", tipo: "azione" },
  Apple: { ticker: "AAPL", tipo: "azione" },
  Microsoft: { ticker: "MSFT", tipo: "azione" },
  Tesla: { ticker: "TSLA", tipo: "azione" },
  Amazon: { ticker: "AMZN", tipo: "azione" },
  Google: { ticker: "GOOGL", tipo: "azione" },
  Meta: { ticker: "META", tipo: "azione" },
  "S&P 500": { ticker: "^GSPC", tipo: "indice" },
  Nasdaq: { ticker: "^IXIC", tipo: "indice" },
  "Dow Jones": { ticker: "^DJI", tipo: "indice" },
};

export function isStockOrIndex(nome: string): boolean {
  return nome in STOCK_TICKER_MAP;
}

export interface StockPriceResult {
  nome: string;
  ticker: string;
  tipo: StockOrIndexType;
  prezzoChiusura: number;
}

// Yahoo Finance non ufficiale (nessuna chiave, nessun SLA) — coerente con
// il rischio di rottura già accettato in docs/piano-architettura.md. Un
// singolo ticker che fallisce non blocca gli altri.
export async function fetchStockPrices(
  nomi: string[],
): Promise<StockPriceResult[]> {
  const mappati = nomi
    .map((nome) => ({ nome, mapping: STOCK_TICKER_MAP[nome] }))
    .filter(
      (x): x is { nome: string; mapping: { ticker: string; tipo: StockOrIndexType } } =>
        Boolean(x.mapping),
    );

  const risultati: StockPriceResult[] = [];
  for (const { nome, mapping } of mappati) {
    try {
      const quote = await yahooFinance.quote(mapping.ticker);
      const prezzo = quote.regularMarketPrice;
      if (prezzo === undefined) {
        log.error(`Yahoo Finance: prezzo mancante per ${nome} (${mapping.ticker})`);
        continue;
      }
      risultati.push({
        nome,
        ticker: mapping.ticker,
        tipo: mapping.tipo,
        prezzoChiusura: prezzo,
      });
    } catch (err) {
      log.error(
        `Yahoo Finance: richiesta fallita per ${nome} (${mapping.ticker}) — ${String(err)}`,
      );
    }
  }
  return risultati;
}
