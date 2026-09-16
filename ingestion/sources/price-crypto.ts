import { log } from "../log";

// Mappa curata nome normalizzato (come lo estrae extract-entities.ts) -> ID
// CoinGecko. Stesso principio dei feed RSS: meglio una lista piccola e
// verificata che una automatica e fragile. Estendere quando un asset
// ricorrente non trova corrispondenza (vedi log "prezzo non recuperato").
const CRYPTO_ID_MAP: Record<string, string> = {
  Bitcoin: "bitcoin",
  Ethereum: "ethereum",
  Solana: "solana",
  XRP: "ripple",
  Cardano: "cardano",
  Dogecoin: "dogecoin",
  BNB: "binancecoin",
  "Shiba Inu": "shiba-inu",
  Polkadot: "polkadot",
  Litecoin: "litecoin",
};

export function isCryptoAsset(nome: string): boolean {
  return nome in CRYPTO_ID_MAP;
}

export interface CryptoPriceResult {
  nome: string;
  prezzoChiusura: number;
}

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

// API pubblica CoinGecko, nessuna chiave richiesta. Restituisce il prezzo
// corrente (non uno storico): per gli scopi di PriceSnapshot va bene, dato
// che ogni digest registra un proprio snapshot nel tempo.
export async function fetchCryptoPrices(
  nomi: string[],
): Promise<CryptoPriceResult[]> {
  const mappati = nomi
    .map((nome) => ({ nome, id: CRYPTO_ID_MAP[nome] }))
    .filter((x): x is { nome: string; id: string } => Boolean(x.id));

  if (mappati.length === 0) return [];

  const ids = [...new Set(mappati.map((m) => m.id))].join(",");
  const url = `${COINGECKO_URL}?ids=${ids}&vs_currencies=usd`;

  let data: Record<string, { usd?: number }>;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      log.error(`CoinGecko: risposta ${response.status} per ${ids}`);
      return [];
    }
    data = await response.json();
  } catch (err) {
    log.error(`CoinGecko: richiesta fallita per ${ids} — ${String(err)}`);
    return [];
  }

  const risultati: CryptoPriceResult[] = [];
  for (const { nome, id } of mappati) {
    const prezzo = data[id]?.usd;
    if (prezzo === undefined) {
      log.error(`CoinGecko: prezzo non recuperato per ${nome} (${id})`);
      continue;
    }
    risultati.push({ nome, prezzoChiusura: prezzo });
  }
  return risultati;
}
