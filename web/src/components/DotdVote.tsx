"use client";

import { useCallback, useEffect, useState } from "react";
import { teamColor } from "@/lib/teams";

interface Candidate {
  driver: string;
  team: string;
}

interface DotdState {
  configured: boolean;
  open: boolean;
  total: number;
  results: { driver: string; votes: number }[];
  voted: string | null;
}

export function DotdVote({
  year,
  round,
  candidates,
}: {
  year: number;
  round: number;
  candidates: Candidate[];
}) {
  const [state, setState] = useState<DotdState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/dotd?year=${year}&round=${round}`, {
        cache: "no-store",
      });
      setState((await res.json()) as DotdState);
    } catch {
      setState(null);
    }
  }, [year, round]);

  useEffect(() => {
    load();
  }, [load]);

  if (!state || !state.configured) return null;
  if (!state.open && state.total === 0) return null;

  const vote = async (driver: string) => {
    if (busy || state.voted) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dotd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, round, driver }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  const teamOf = (driver: string) =>
    candidates.find((c) => c.driver === driver)?.team ?? "";

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <p className="kicker">Fan vote</p>
        <h2 className="mt-1 text-xl font-bold">Driver of the Day</h2>
        <p className="mt-1 text-sm text-mute">
          {state.open
            ? state.voted
              ? `You voted for ${state.voted}. Live results below.`
              : "Who impressed you most? One vote per fan."
            : `Voting closed · ${state.total.toLocaleString()} votes`}
        </p>
      </div>

      {state.open && !state.voted ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {candidates.map((c) => (
            <button
              key={c.driver}
              type="button"
              disabled={busy}
              onClick={() => vote(c.driver)}
              className="card flex items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:border-accent/60 disabled:opacity-50"
            >
              <span
                className="inline-block h-3.5 w-1 shrink-0 rounded-sm"
                style={{ background: teamColor(c.team) }}
              />
              <span className="truncate">{c.driver}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {state.results.slice(0, 8).map((r) => {
            const pct = state.total > 0 ? (r.votes / state.total) * 100 : 0;
            return (
              <div key={r.driver} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate font-medium">{r.driver}</span>
                <div className="h-3.5 flex-1 rounded-sm bg-card-2">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${Math.max(pct, 1)}%`,
                      background: teamColor(teamOf(r.driver)),
                    }}
                  />
                </div>
                <span className="num w-12 text-right text-ink-2">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
          {state.total === 0 ? (
            <p className="text-sm text-mute">No votes yet — be the first.</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
