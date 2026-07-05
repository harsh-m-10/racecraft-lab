import type { Metadata } from "next";
import Link from "next/link";
import { getSeason, getSeasonYears } from "@/lib/data";

export const metadata: Metadata = {
  title: "Seasons",
  description:
    "Race-by-race pace and qualifying gaps for every F1 season since 2018.",
};

export default function SeasonsPage() {
  const years = getSeasonYears();
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Seasons</h1>
        <p className="mt-2 text-ink-2">
          Race pace and qualifying head-to-heads, event by event.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {years.map((y) => {
          const season = getSeason(y);
          const events = season?.events.length ?? 0;
          return (
            <Link
              key={y}
              href={`/seasons/${y}`}
              className="card group flex items-center justify-between px-4 py-4 transition-colors hover:border-brand/60"
            >
              <span className="text-xl font-bold group-hover:text-brand">
                {y}
              </span>
              <span className="text-xs uppercase tracking-wider text-mute">
                {events} rounds
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
