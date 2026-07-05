"use client";

import { useState } from "react";
import type { SeasonEvent } from "@/lib/data";
import { BarList, type BarRow } from "@/components/Bars";

export function EventExplorer({ events }: { events: SeasonEvent[] }) {
  const withData = events.filter(
    (e) => e.race_pace.length > 0 || e.quali_h2h.length > 0,
  );
  const [round, setRound] = useState(withData[0]?.round ?? 0);
  const ev = withData.find((e) => e.round === round) ?? withData[0];

  if (!ev) {
    return (
      <p className="text-sm text-mute">No event data for this season yet.</p>
    );
  }

  const paceRows: BarRow[] = [...ev.race_pace]
    .sort((a, b) => a.gap_pct - b.gap_pct)
    .map((r) => ({
      label: r.driver,
      value: r.gap_pct,
      display: `+${r.gap_pct.toFixed(2)}%`,
      sub: `${r.clean_laps} laps`,
    }));

  // The export lists each pairing from both drivers' perspectives;
  // keep only the winner's side (or the alphabetical one on a dead heat).
  const qualiRows: BarRow[] = ev.quali_h2h
    .filter(
      (q) =>
        q.gap_pct < 0 || (q.gap_pct === 0 && q.driver.localeCompare(q.teammate) < 0),
    )
    .sort((a, b) => a.gap_pct - b.gap_pct)
    .map((q) => ({
      label: `${q.driver} over ${q.teammate}`,
      value: Math.abs(q.gap_pct),
      display: `${Math.abs(q.gap_pct).toFixed(3)}%`,
      sub: `${q.team} · ${q.segment}`,
    }));

  return (
    <div className="flex flex-col gap-6">
      <select
        value={ev.round}
        onChange={(e) => setRound(Number(e.target.value))}
        className="card w-full max-w-md appearance-none px-3 py-2.5 text-sm text-ink outline-none focus:border-blue"
      >
        {withData.map((e) => (
          <option key={e.round} value={e.round}>
            R{e.round} · {e.event}
          </option>
        ))}
      </select>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-4 p-5">
          <div>
            <h3 className="font-bold">Race pace</h3>
            <p className="mt-1 text-xs text-mute">
              Median clean-lap gap to the fastest car. Shorter bar = faster.
            </p>
          </div>
          {paceRows.length > 0 ? (
            <BarList rows={paceRows} />
          ) : (
            <p className="text-sm text-mute">
              No dry-race pace data for this event (wet race or no clean laps).
            </p>
          )}
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <div>
            <h3 className="font-bold">Qualifying head-to-head</h3>
            <p className="mt-1 text-xs text-mute">
              Winning teammate and their margin, in the deepest segment both
              reached. Longer bar = bigger beatdown.
            </p>
          </div>
          {qualiRows.length > 0 ? (
            <BarList rows={qualiRows} labelWidth={240} />
          ) : (
            <p className="text-sm text-mute">
              No teammate comparisons for this event.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
