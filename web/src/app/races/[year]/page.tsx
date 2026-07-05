import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeason, getSeasonYears } from "@/lib/data";
import { SeasonGrid } from "@/components/SeasonGrid";

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
    title: `${year} results`,
    description: `Every ${year} Formula 1 race result: race, sprint and qualifying classifications with lap-data debriefs.`,
  };
}

export default async function SeasonResultsPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const season = getSeason(parseInt(year, 10));
  if (!season) notFound();

  const years = getSeasonYears();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="kicker">Race archive</p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">
          {season.season} results
        </h1>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {years.map((y) => (
          <Link
            key={y}
            href={`/races/${y}`}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              y === season.season
                ? "bg-accent text-white"
                : "bg-card-2 text-ink-2 hover:text-ink"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <SeasonGrid year={season.season} events={season.events} />
    </div>
  );
}
