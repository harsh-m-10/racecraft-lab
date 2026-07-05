import Link from "next/link";
import {
  getSchedule,
  getStandings,
  latestEventWithResults,
  latestRace,
} from "@/lib/data";
import { getNews } from "@/lib/news";
import { teamColor } from "@/lib/teams";
import { Countdown } from "@/components/Countdown";
import { PodiumStrip } from "@/components/ResultTable";
import { BarList } from "@/components/Bars";
import { LocalTime } from "@/components/LocalTime";

export const revalidate = 1800;

export default async function Home() {
  const schedule = getSchedule();
  const standings = getStandings();
  const latest = latestEventWithResults();
  const race = latestRace();
  const news = await getNews(8);

  const paceRows = race
    ? [...race.event.race_pace]
        .sort((a, b) => a.gap_pct - b.gap_pct)
        .slice(0, 6)
        .map((r) => ({
          label: r.driver,
          value: Math.max(r.gap_pct, 0.02),
          display: r.gap_pct === 0 ? "benchmark" : `+${r.gap_pct.toFixed(2)}%`,
        }))
    : [];

  return (
    <div className="flex flex-col gap-10">
      {/* Next race hero */}
      <section className="grid gap-8 pt-2 lg:grid-cols-[3fr_2fr]">
        <Countdown events={schedule.events} />

        {/* Latest results */}
        <div className="card flex flex-col gap-4 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold uppercase tracking-wider text-sm">
              Latest results
            </h2>
            {latest ? (
              <Link
                href={`/races/${latest.year}/${latest.event.round}`}
                className="text-xs text-accent hover:underline"
              >
                {latest.event.event} →
              </Link>
            ) : null}
          </div>
          {latest ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {latest.event.race_result.length > 0 ? (
                <PodiumStrip rows={latest.event.race_result} title="Race" />
              ) : null}
              {latest.event.sprint_result.length > 0 ? (
                <PodiumStrip rows={latest.event.sprint_result} title="Sprint" />
              ) : null}
              {latest.event.quali_result.length > 0 ? (
                <PodiumStrip
                  rows={latest.event.quali_result.map((q) => ({
                    position: q.position,
                    driver: q.driver,
                    team: q.team,
                    grid: null,
                    status: "",
                    points: 0,
                  }))}
                  title="Qualifying"
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-mute">No results yet.</p>
          )}

          {/* Standings preview */}
          <div className="mt-2 border-t border-line pt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Championship
              </h2>
              <Link
                href="/standings"
                className="text-xs text-accent hover:underline"
              >
                Full standings →
              </Link>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {standings.drivers.slice(0, 6).map((d) => (
                <div
                  key={d.driver_id}
                  className="flex items-center gap-2.5 text-sm"
                >
                  <span className="num w-5 font-black text-ink-2">
                    {d.position}
                  </span>
                  <span
                    className="inline-block h-3.5 w-1 rounded-sm"
                    style={{ background: teamColor(d.team) }}
                  />
                  <span className="flex-1 font-medium">{d.driver}</span>
                  <span className="num font-semibold">{d.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Debrief */}
      {race && paceRows.length > 0 ? (
        <section className="card flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="kicker">The Debrief</p>
              <h2 className="mt-1 text-xl font-bold">
                {race.event.event}: who actually had the pace
              </h2>
            </div>
            <Link
              href={`/races/${race.year}/${race.event.round}`}
              className="text-sm text-accent hover:underline"
            >
              Full debrief →
            </Link>
          </div>
          <p className="max-w-2xl text-sm text-ink-2">
            True race pace from every clean lap — traffic, pit stops and safety
            cars stripped out. The result table tells you who finished ahead;
            this tells you who was actually faster.
          </p>
          <BarList rows={paceRows} />
        </section>
      ) : null}

      {/* News */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Paddock news</h2>
          <Link href="/news" className="text-sm text-accent hover:underline">
            All news →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {news.map((n) => (
            <a
              key={n.link}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="card group flex flex-col gap-1.5 px-4 py-3 transition-colors hover:border-accent/50"
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
            <p className="text-sm text-mute">News feed unavailable right now.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
