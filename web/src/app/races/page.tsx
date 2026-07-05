import type { Metadata } from "next";
import Link from "next/link";
import { getSeason, getSeasonYears } from "@/lib/data";
import { SeasonGrid } from "@/components/SeasonGrid";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Race results for every Formula 1 Grand Prix since 2018 — race, sprint and qualifying classifications plus the lap-data debrief.",
};

export default function RacesPage() {
  const years = getSeasonYears();
  const latest = years[0];
  const season = getSeason(latest);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="kicker">Race archive</p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">
          Results
        </h1>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {years.map((y) => (
          <Link
            key={y}
            href={y === latest ? "/races" : `/races/${y}`}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              y === latest
                ? "bg-accent text-white"
                : "bg-card-2 text-ink-2 hover:text-ink"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <SeasonGrid year={latest} events={season?.events ?? []} />
    </div>
  );
}
