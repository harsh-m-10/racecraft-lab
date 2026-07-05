import Link from "next/link";
import { getLeaderboard, getSeasonYears } from "@/lib/data";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export default function Home() {
  const rows = getLeaderboard();
  const latestSeason = getSeasonYears()[0];
  const podium = rows.slice(0, 3);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 pt-4 sm:pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          F1 driver rankings · 2018–{latestSeason}
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Who&apos;s actually fast?
        </h1>
        <p className="max-w-2xl text-base text-ink-2 sm:text-lg">
          Rankings built from every clean racing lap since 2018 — race pace,
          qualifying head-to-head, tyre management, launches. Traffic, strategy
          and luck stripped out. No narratives, just lap times.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {podium.map((r, i) => (
          <Link
            key={r.slug}
            href={`/drivers/${r.slug}`}
            className="card group flex flex-col gap-3 p-5 transition-colors hover:border-brand/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                P{i + 1}
              </span>
              <span className="text-xs uppercase tracking-wider text-mute">
                {r.total_races} races
              </span>
            </div>
            <span className="text-xl font-bold group-hover:text-brand">
              {r.driver}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="num text-3xl font-bold text-blue">
                {r.power_score_v2.toFixed(1)}
              </span>
              <span className="text-xs uppercase tracking-wider text-mute">
                Power Score v2
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Active driver leaderboard</h2>
          <span className="text-xs text-mute">
            click a column to re-rank · scores: 50 = league average
          </span>
        </div>
        <LeaderboardTable rows={rows} />
        <p className="text-xs text-mute">
          Every score is normalized to a 50±10 scale within its era, so a 65 in
          2019 means the same thing as a 65 today. Full definitions in the{" "}
          <Link href="/methodology" className="text-blue hover:underline">
            methodology
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
