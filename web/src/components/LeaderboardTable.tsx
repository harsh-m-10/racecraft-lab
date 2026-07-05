"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LeaderboardRow } from "@/lib/data";

type SortKey =
  | "power_score_v2"
  | "race_pace"
  | "quali_h2h"
  | "tyre_management"
  | "launch"
  | "delta_score"
  | "sunday_edge"
  | "chaos_index"
  | "total_races";

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: "power_score_v2", label: "Power v2", title: "Composite of all metrics" },
  { key: "race_pace", label: "Pace", title: "Race pace vs the fastest car" },
  { key: "quali_h2h", label: "Quali", title: "Qualifying head-to-head vs teammate" },
  { key: "tyre_management", label: "Tyres", title: "Tyre degradation vs teammate" },
  { key: "launch", label: "Launch", title: "Lap-1 positions gained" },
  { key: "delta_score", label: "Delta", title: "Finish vs grid, teammate-adjusted" },
  { key: "sunday_edge", label: "Sunday", title: "Race-day gains and consistency" },
  { key: "chaos_index", label: "Chaos", title: "Performance in chaotic races" },
  { key: "total_races", label: "Races", title: "Races since 2018" },
];

function cellClass(v: number | null, key: SortKey) {
  if (v === null) return "text-mute";
  if (key === "total_races") return "text-ink-2";
  if (v >= 60) return "text-blue font-semibold";
  if (v < 42) return "text-brand/90";
  return "text-ink-2";
}

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("power_score_v2");

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity),
      ),
    [rows, sortKey],
  );

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mute">
            <th className="px-3 py-3 font-medium">#</th>
            <th className="px-3 py-3 font-medium">Driver</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-2 py-1.5 text-right font-medium">
                <button
                  type="button"
                  title={c.title}
                  onClick={() => setSortKey(c.key)}
                  className={`rounded px-1 py-1.5 uppercase tracking-wider transition-colors hover:text-ink ${
                    sortKey === c.key ? "text-brand" : ""
                  }`}
                >
                  {c.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={r.slug}
              className="border-b border-line/60 last:border-0 hover:bg-card-2/60"
            >
              <td className="num px-3 py-2.5 text-mute">{i + 1}</td>
              <td className="px-3 py-2.5">
                <Link
                  href={`/drivers/${r.slug}`}
                  className="font-medium hover:underline underline-offset-2"
                >
                  {r.driver}
                </Link>
                {r.low_confidence ? (
                  <span
                    className="ml-2 rounded bg-card-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-mute"
                    title="Not enough telemetry history for all metrics"
                  >
                    low data
                  </span>
                ) : null}
              </td>
              {COLUMNS.map((c) => (
                <td
                  key={c.key}
                  className={`num px-3 py-2.5 text-right ${cellClass(r[c.key], c.key)}`}
                >
                  {r[c.key] === null
                    ? "—"
                    : c.key === "total_races"
                      ? r[c.key]
                      : (r[c.key] as number).toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
