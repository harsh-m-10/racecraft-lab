import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDriver, getDriverSlugs } from "@/lib/data";
import { StatTile } from "@/components/Score";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDriverSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = getDriver(slug);
  if (!d) return {};
  return {
    title: d.driver,
    description: `${d.driver}: Power Score v2 ${d.power_score_v2.toFixed(1)} across ${d.total_races} races since 2018. Race pace, qualifying head-to-head and tyre management from lap-level data.`,
  };
}

const fmtPct = (v: number | null, digits = 2) =>
  v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;

const fmtScore = (v: number | null) => (v === null ? "—" : v.toFixed(1));

export default async function DriverPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = getDriver(slug);
  if (!d) notFound();

  const seasons = [...d.seasons].sort((a, b) => b.season - a.season);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/drivers" className="text-sm text-mute hover:text-ink">
          ← All drivers
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{d.driver}</h1>
          {d.is_active ? (
            <span className="rounded-full border border-good/50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-good">
              On the grid
            </span>
          ) : (
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-mute">
              Former
            </span>
          )}
          {d.low_confidence ? (
            <span
              className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-mute"
              title="Not enough telemetry history for all metrics; missing ones are treated as league-average."
            >
              Low data
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-ink-2">
          {d.total_races} races · {seasons.length}{" "}
          {seasons.length === 1 ? "season" : "seasons"} since 2018
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Power Score v2" value={d.power_score_v2} accent />
        <StatTile
          label="Race pace"
          value={d.race_pace}
          hint="Clean-lap speed vs the fastest car"
        />
        <StatTile
          label="Quali head-to-head"
          value={d.quali_h2h}
          hint="Vs teammate, deepest shared segment"
        />
        <StatTile
          label="Tyre management"
          value={d.tyre_management}
          hint="Degradation vs teammate, same compound"
        />
        <StatTile label="Launch" value={d.launch} hint="Lap-1 positions gained" />
        <StatTile
          label="Delta score"
          value={d.delta_score}
          hint="Finish vs grid, teammate-adjusted"
        />
        <StatTile
          label="Sunday edge"
          value={d.sunday_edge}
          hint="Race-day gains and consistency"
        />
        <StatTile
          label="Chaos index"
          value={d.chaos_index}
          hint="Performance when races go sideways"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Season by season</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mute">
                <th className="px-3 py-3 font-medium">Season</th>
                <th className="px-3 py-3 text-right font-medium">Races</th>
                <th
                  className="px-3 py-3 text-right font-medium"
                  title="Average clean-lap gap to the fastest car; lower is faster"
                >
                  Pace gap
                </th>
                <th
                  className="px-3 py-3 text-right font-medium"
                  title="Median qualifying gap to teammate; negative = faster"
                >
                  Quali gap
                </th>
                <th className="px-3 py-3 text-right font-medium">Pace</th>
                <th className="px-3 py-3 text-right font-medium">Quali</th>
                <th className="px-3 py-3 text-right font-medium">Tyres</th>
                <th className="px-3 py-3 text-right font-medium">Launch</th>
                <th className="px-3 py-3 text-right font-medium">Delta</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr
                  key={s.season}
                  className="border-b border-line/60 last:border-0"
                >
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/seasons/${s.season}`}
                      className="font-medium hover:underline underline-offset-2"
                    >
                      {s.season}
                    </Link>
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">
                    {s.races}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">
                    {s.avg_pace_gap_pct === null
                      ? "—"
                      : `+${s.avg_pace_gap_pct.toFixed(2)}%`}
                  </td>
                  <td
                    className={`num px-3 py-2.5 text-right ${
                      s.quali_median_gap_pct === null
                        ? "text-mute"
                        : s.quali_median_gap_pct < 0
                          ? "text-blue"
                          : "text-brand/90"
                    }`}
                  >
                    {fmtPct(s.quali_median_gap_pct, 3)}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">
                    {fmtScore(s.race_pace_norm)}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">
                    {fmtScore(s.quali_h2h_norm)}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">
                    {fmtScore(s.tyre_management_norm)}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">
                    {fmtScore(s.launch_norm)}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-ink-2">
                    {fmtScore(s.overperformance_norm)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-mute">
          Scores are normalized per season (50 = that season&apos;s average
          driver). Pace gap is the average clean-lap deficit to the fastest car
          in dry races; quali gap is the median deficit to the teammate in
          their deepest shared session.
        </p>
      </section>
    </div>
  );
}
