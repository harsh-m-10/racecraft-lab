import Link from "next/link";
import type { SeasonEvent } from "@/lib/data";
import { teamColor } from "@/lib/teams";

export function SeasonGrid({
  year,
  events,
}: {
  year: number;
  events: SeasonEvent[];
}) {
  const ordered = [...events].reverse();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((ev) => {
        const winner = ev.race_result[0];
        const pole = ev.quali_result[0];
        return (
          <Link
            key={ev.round}
            href={`/races/${year}/${ev.round}`}
            className="card group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:border-accent/50"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">
              Round {ev.round}
            </span>
            <span className="font-bold leading-tight group-hover:text-accent">
              {ev.event}
            </span>
            <div className="flex flex-col gap-1 text-sm">
              {winner ? (
                <span className="flex items-center gap-2">
                  <span className="w-9 text-[11px] uppercase tracking-wider text-mute">
                    Win
                  </span>
                  <span
                    className="inline-block h-3.5 w-1 rounded-sm"
                    style={{ background: teamColor(winner.team) }}
                  />
                  <span className="font-medium">{winner.driver}</span>
                </span>
              ) : (
                <span className="text-xs text-mute">Race to come</span>
              )}
              {pole ? (
                <span className="flex items-center gap-2">
                  <span className="w-9 text-[11px] uppercase tracking-wider text-mute">
                    Pole
                  </span>
                  <span
                    className="inline-block h-3.5 w-1 rounded-sm"
                    style={{ background: teamColor(pole.team) }}
                  />
                  <span className="font-medium">{pole.driver}</span>
                </span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
