import { beforeEach, describe, expect, it, vi } from "vitest";

const parseURLMock = vi.fn();

vi.mock("rss-parser", () => {
  class FakeParser {
    parseURL = parseURLMock;
  }
  return { default: FakeParser };
});

const { fetchFeed, fetchAllNews } = await import(
  "@/ingestion/sources/news-rss"
);
type RssFeedConfig = Parameters<typeof fetchFeed>[0];

const feed: RssFeedConfig = {
  fonte: "Test Feed",
  url: "https://example.com/rss",
  categoria: "crypto",
};

describe("fetchFeed", () => {
  beforeEach(() => {
    parseURLMock.mockReset();
  });

  it("normalizza gli item del feed in RawNewsItem", async () => {
    parseURLMock.mockResolvedValue({
      items: [
        {
          title: "Bitcoin sale del 5%",
          link: "https://example.com/articolo-1",
          contentSnippet: "Estratto dell'articolo",
          isoDate: "2026-09-15T10:00:00.000Z",
        },
      ],
    });

    const result = await fetchFeed(feed);

    expect(result).toEqual([
      {
        fonte: "Test Feed",
        url: "https://example.com/articolo-1",
        titolo: "Bitcoin sale del 5%",
        estratto: "Estratto dell'articolo",
        dataPubblicazione: new Date("2026-09-15T10:00:00.000Z"),
      },
    ]);
  });

  it("usa content come fallback quando manca contentSnippet", async () => {
    parseURLMock.mockResolvedValue({
      items: [
        {
          title: "Titolo",
          link: "https://example.com/2",
          content: "Contenuto completo",
        },
      ],
    });

    const result = await fetchFeed(feed);

    expect(result[0].estratto).toBe("Contenuto completo");
  });

  it("scarta gli item senza titolo o senza link", async () => {
    parseURLMock.mockResolvedValue({
      items: [
        { title: "Senza link", link: undefined },
        { title: undefined, link: "https://example.com/senza-titolo" },
        { title: "Ok", link: "https://example.com/ok" },
      ],
    });

    const result = await fetchFeed(feed);

    expect(result).toHaveLength(1);
    expect(result[0].titolo).toBe("Ok");
  });
});

describe("fetchAllNews", () => {
  beforeEach(() => {
    parseURLMock.mockReset();
  });

  it("continua con gli altri feed se uno fallisce", async () => {
    const feeds: RssFeedConfig[] = [
      { fonte: "A", url: "https://a.example.com/rss", categoria: "crypto" },
      {
        fonte: "B",
        url: "https://b.example.com/rss",
        categoria: "tradizionale",
      },
    ];

    parseURLMock
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({
        items: [
          {
            title: "Notizia B",
            link: "https://b.example.com/1",
            contentSnippet: "...",
            isoDate: "2026-09-15T10:00:00.000Z",
          },
        ],
      });

    const result = await fetchAllNews(feeds);

    expect(result).toHaveLength(1);
    expect(result[0].fonte).toBe("B");
  });
});
