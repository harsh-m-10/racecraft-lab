import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, getSeason, getSeasonYears } from "@/lib/data";
import { QualiTable, RaceTable } from "@/components/ResultTable";
import { BarList } from "@/components/Bars";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSeasonYears().flatMap((year) => {
    const season = getSeason(year);
    return (season?.events ?? []).map((ev) => ({
      year: String(year),
      round: String(ev.round),
    }));
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; round: string }>;
}): Promise<Metadata> {
  const { year, round } = await params;
  const ev = getEvent(parseInt(year, 10), parseInt(round, 10));
  if (!ev) return {};
  const winner = ev.race_result[0];
  return {
    title: `${ev.event} ${year}`,
    description: winner
      ? `${year} ${ev.event} results: ${winner.driver} wins. Full race, sprint and qualifying classification plus the true-pace debrief.`
      : `${year} ${ev.event}: qualifying and sprint results, race to come.`,
  };
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ year: string; round: string }>;
}) {
  const { year, round } = await params;
  const y = parseInt(year, 10);
  const ev = getEvent(y, parseInt(round, 10));
  if (!ev) notFound();

  const paceRows = [...ev.race_pace]
    .sort((a, b) => a.gap_pct - b.gap_pct)
    .map((r) => ({
      label: r.driver,
      value: Math.max(r.gap_pct, 0.02),
      display: r.gap_pct === 0 ? "benchmark" : `+${r.gap_pct.toFixed(2)}%`,
      sub: `${r.clean_laps} laps`,
    }));

  const qualiRows = ev.quali_h2h
    .filter(
      (q) =>
        q.gap_pct < 0 ||
        (q.gap_pct === 0 && q.driver.localeCompare(q.teammate) < 0),
    )
    .sort((a, b) => a.gap_pct - b.gap_pct)
    .map((q) => ({
      label: `${q.driver} over ${q.teammate}`,
      value: Math.abs(q.gap_pct),
      display: `${Math.abs(q.gap_pct).toFixed(3)}%`,
      sub: `${q.team} · ${q.segment}`,
    }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/races/${y}`} className="text-sm text-mute hover:text-ink">
          ← {y} season
        </Link>
        <p className="kicker mt-3">
          Round {ev.round} · {y}
        </p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight sm:text-4xl">
          {ev.event}
        </h1>
      </div>

      {ev.race_result.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Race</h2>
          <RaceTable rows={ev.race_result} />
        </section>
      ) : (
        <p className="card px-4 py-3 text-sm text-ink-2">
          The race hasn&apos;t happened yet — results appear here shortly after
          the chequered flag.
        </p>
      )}

      {ev.sprint_result.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Sprint</h2>
          <RaceTable rows={ev.sprint_result} />
        </section>
      ) : null}

      {ev.quali_result.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Qualifying</h2>
          <QualiTable rows={ev.quali_result} />
        </section>
      ) : null}

      {paceRows.length > 0 || qualiRows.length > 0 ? (
        <section className="card flex flex-col gap-6 p-5 sm:p-6">
          <div>
            <p className="kicker">The Debrief</p>
            <h2 className="mt-1 text-xl font-bold">
              What the lap data actually says
            </h2>
          </div>

          {paceRows.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-bold">True race pace</h3>
                <p className="mt-1 text-xs text-mute">
                  Median clean-lap gap to the fastest car — traffic, pit stops
                  and safety cars stripped out. Shorter bar = faster car+driver.
                </p>
              </div>
              <BarList rows={paceRows} />
            </div>
          ) : null}

          {qualiRows.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-bold">Teammate gap in qualifying</h3>
                <p className="mt-1 text-xs text-mute">
                  Same car, same day: the winning teammate and their margin in
                  the deepest session both reached.
                </p>
              </div>
              <BarList rows={qualiRows} labelWidth={240} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
