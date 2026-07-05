import type { Metadata } from "next";
import { getSchedule } from "@/lib/data";
import { Flag } from "@/lib/flags";
import { LocalTime } from "@/components/LocalTime";

export const metadata: Metadata = {
  title: "Schedule",
  description:
    "The full Formula 1 calendar with every session time shown in your timezone.",
};

export default function SchedulePage() {
  const schedule = getSchedule();
  const now = Date.now();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="kicker">{schedule.season} calendar</p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">
          Race schedule
        </h1>
        <p className="mt-2 text-ink-2">
          All {schedule.events.length} rounds. Session times shown in your
          timezone.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {schedule.events.map((ev) => {
          const last = ev.sessions[ev.sessions.length - 1];
          const past = last && new Date(last.date_utc).getTime() + 3 * 3600_000 < now;
          return (
            <div
              key={ev.round}
              className={`card flex flex-col gap-3 p-5 ${past ? "opacity-55" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-mute">
                    Round {ev.round} · {ev.country}
                    {ev.format.startsWith("sprint") ? (
                      <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-accent">
                        Sprint
                      </span>
                    ) : null}
                  </p>
                  <h2 className="mt-1 flex items-center gap-2 text-lg font-bold leading-tight">
                    <Flag country={ev.country} /> {ev.name}
                  </h2>
                  <p className="text-sm text-mute">{ev.location}</p>
                </div>
                {ev.sessions[0] ? (
                  <span className="shrink-0 text-sm font-semibold text-ink-2">
                    <LocalTime iso={ev.sessions[0].date_utc} mode="date" />
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {ev.sessions.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-ink-2">{s.name}</span>
                    <LocalTime iso={s.date_utc} mode="datetime" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
