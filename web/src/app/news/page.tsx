import type { Metadata } from "next";
import { getNews } from "@/lib/news";
import { LocalTime } from "@/components/LocalTime";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "News",
  description:
    "The latest Formula 1 headlines from BBC Sport, Autosport, RaceFans and Motorsport.com in one feed.",
};

export default async function NewsPage() {
  const news = await getNews(40);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="kicker">From the paddock</p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">
          F1 news
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          Headlines from BBC Sport, Autosport, RaceFans and Motorsport.com.
          Refreshed every 30 minutes; links open at the source.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {news.map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="card group flex flex-col gap-1 px-4 py-3 transition-colors hover:border-accent/50"
          >
            <span className="font-medium leading-snug group-hover:text-accent">
              {n.title}
            </span>
            <span className="text-xs text-mute">
              {n.source} · <LocalTime iso={n.published} mode="datetime" />
            </span>
          </a>
        ))}
        {news.length === 0 ? (
          <p className="text-sm text-mute">
            News feed unavailable right now — try again in a few minutes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
