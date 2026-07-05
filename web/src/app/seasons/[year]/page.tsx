import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeason, getSeasonYears } from "@/lib/data";
import { EventExplorer } from "@/components/EventExplorer";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSeasonYears().map((y) => ({ year: String(y) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} season`,
    description: `Race-by-race pace and qualifying head-to-heads for the ${year} F1 season, from lap-level timing data.`,
  };
}

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const season = getSeason(parseInt(year, 10));
  if (!season) notFound();

  const years = getSeasonYears();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/seasons" className="text-sm text-mute hover:text-ink">
          ← All seasons
        </Link>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          {season.season} season
        </h1>
        <p className="mt-2 text-ink-2">
          {season.events.length} rounds · pick a Grand Prix to see who really
          had the pace.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {years.map((y) => (
            <Link
              key={y}
              href={`/seasons/${y}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                y === season.season
                  ? "bg-brand text-white"
                  : "bg-card-2 text-ink-2 hover:text-ink"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>
      <EventExplorer events={season.events} />
    </div>
  );
}
