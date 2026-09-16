import Parser from "rss-parser";
import { log } from "../log";

export interface RssFeedConfig {
  fonte: string;
  url: string;
  categoria: "crypto" | "tradizionale";
}

// Set curato iniziale: due fonti per ambito, editorialmente distinte,
// verificate raggiungibili il 2026-09-15. Ampliabile in futuro, meglio
// partire piccoli e verificati che con una lista lunga non controllata.
export const RSS_FEEDS: RssFeedConfig[] = [
  {
    fonte: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    categoria: "crypto",
  },
  {
    fonte: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    categoria: "crypto",
  },
  {
    fonte: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    categoria: "tradizionale",
  },
  {
    fonte: "WSJ Markets",
    url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    categoria: "tradizionale",
  },
];

export interface RawNewsItem {
  fonte: string;
  url: string;
  titolo: string;
  estratto: string;
  dataPubblicazione: Date;
  categoria: "crypto" | "tradizionale";
}

const parser = new Parser();

export async function fetchFeed(feed: RssFeedConfig): Promise<RawNewsItem[]> {
  const parsed = await parser.parseURL(feed.url);
  return (parsed.items ?? [])
    .filter((item) => item.title && item.link)
    .map((item) => ({
      fonte: feed.fonte,
      url: item.link!,
      titolo: item.title!,
      estratto: item.contentSnippet ?? item.content ?? "",
      dataPubblicazione: item.isoDate ? new Date(item.isoDate) : new Date(),
      categoria: feed.categoria,
    }));
}

// Un feed che fallisce non deve bloccare gli altri: raccoglie quello
// che riesce, logga il resto come errore.
export async function fetchAllNews(
  feeds: RssFeedConfig[] = RSS_FEEDS,
): Promise<RawNewsItem[]> {
  const results = await Promise.allSettled(feeds.map(fetchFeed));

  const items: RawNewsItem[] = [];
  results.forEach((result, i) => {
    const feed = feeds[i];
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      log.error(
        `Feed fallito: ${feed.fonte} (${feed.url}) — ${String(result.reason)}`,
      );
    }
  });
  return items;
}
