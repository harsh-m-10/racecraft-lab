import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  published: string; // ISO timestamp
}

const FEEDS: { url: string; source: string }[] = [
  { url: "https://feeds.bbci.co.uk/sport/formula1/rss.xml", source: "BBC Sport" },
  { url: "https://www.autosport.com/rss/f1/news/", source: "Autosport" },
  { url: "https://www.racefans.net/feed/", source: "RaceFans" },
  { url: "https://www.motorsport.com/rss/f1/news/", source: "Motorsport.com" },
];

const parser = new XMLParser({ ignoreAttributes: false });

interface RssItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  guid?: unknown;
}

function text(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "#text" in v) {
    return String((v as Record<string, unknown>)["#text"]);
  }
  return "";
}

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (RacecraftLab news reader)" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const doc = parser.parse(xml);
    const items: RssItem[] = doc?.rss?.channel?.item ?? [];
    if (!Array.isArray(items)) return [];
    return items
      .map((it) => {
        const published = text(it.pubDate);
        const date = new Date(published);
        return {
          title: text(it.title).trim(),
          link: text(it.link).trim(),
          source,
          published: isNaN(date.getTime())
            ? new Date(0).toISOString()
            : date.toISOString(),
        };
      })
      .filter((it) => it.title && it.link.startsWith("http"));
  } catch {
    return []; // a dead feed must never break the page
  }
}

export async function getNews(limit = 30): Promise<NewsItem[]> {
  const all = (
    await Promise.all(FEEDS.map((f) => fetchFeed(f.url, f.source)))
  ).flat();
  all.sort((a, b) => b.published.localeCompare(a.published));
  // Light dedupe: identical titles from syndication
  const seen = new Set<string>();
  return all
    .filter((it) => {
      const key = it.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
