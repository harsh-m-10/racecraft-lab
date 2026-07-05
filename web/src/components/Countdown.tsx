"use client";

import { useEffect, useState } from "react";
import type { ScheduleEvent } from "@/lib/data";

function sessionWindowMs(name: string): number {
  return name === "Race" || name === "Sprint" ? 2.5 * 3600_000 : 1.5 * 3600_000;
}

interface Live {
  event: ScheduleEvent;
  session: string;
}

interface Next {
  event: ScheduleEvent;
  session: string;
  date: Date;
}

function findState(events: ScheduleEvent[], now: Date): {
  live: Live | null;
  next: Next | null;
} {
  let live: Live | null = null;
  let next: Next | null = null;
  for (const ev of events) {
    for (const s of ev.sessions) {
      const start = new Date(s.date_utc);
      if (
        now >= start &&
        now.getTime() < start.getTime() + sessionWindowMs(s.name)
      ) {
        live = { event: ev, session: s.name };
      } else if (start > now && (!next || start < next.date)) {
        next = { event: ev, session: s.name, date: start };
      }
    }
  }
  return { live, next };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function Countdown({ events }: { events: ScheduleEvent[] }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="h-40" aria-hidden />;
  }

  const { live, next } = findState(events, now);
  const hero = live?.event ?? next?.event;
  if (!hero) {
    return (
      <p className="text-ink-2">Season complete — see you at testing.</p>
    );
  }

  const diff = next ? next.date.getTime() - now.getTime() : 0;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  const fmtTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="kicker">
          Round {hero.round} · {hero.country}
          {hero.format.startsWith("sprint") ? " · Sprint weekend" : ""}
        </p>
        <h1 className="mt-1 text-3xl font-black uppercase leading-none tracking-tight sm:text-5xl">
          {hero.name}
        </h1>
        <p className="mt-2 text-ink-2">{hero.location}</p>
      </div>

      {live ? (
        <div className="flex items-center gap-3 rounded-lg border border-live/40 bg-live/10 px-4 py-3">
          <span className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-live" />
          <span className="font-bold uppercase tracking-wider text-live">
            {live.session} — live now
          </span>
        </div>
      ) : null}

      {next ? (
        <div>
          <p className="text-xs uppercase tracking-wider text-mute">
            {next.session}
            {next.event.round !== hero.round ? ` · ${next.event.name}` : ""} in
          </p>
          <div className="num mt-1 flex items-baseline gap-3 text-4xl font-black sm:text-6xl">
            {days > 0 ? (
              <span>
                {days}
                <span className="text-lg font-bold text-mute sm:text-2xl">d</span>
              </span>
            ) : null}
            <span>
              {pad(hours)}
              <span className="text-lg font-bold text-mute sm:text-2xl">h</span>
            </span>
            <span>
              {pad(mins)}
              <span className="text-lg font-bold text-mute sm:text-2xl">m</span>
            </span>
            <span className="text-accent">
              {pad(secs)}
              <span className="text-lg font-bold text-mute sm:text-2xl">s</span>
            </span>
          </div>
        </div>
      ) : null}

      <div className="card divide-y divide-line">
        {hero.sessions.map((s) => {
          const d = new Date(s.date_utc);
          const past = d.getTime() + sessionWindowMs(s.name) < now.getTime();
          const isLive = live?.session === s.name;
          return (
            <div
              key={s.name}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                past ? "text-mute" : ""
              }`}
            >
              <span className={`font-medium ${isLive ? "text-live" : ""}`}>
                {s.name}
                {isLive ? " · LIVE" : ""}
              </span>
              <span className="num text-ink-2">
                {fmtDay.format(d)} {fmtTime.format(d)}
              </span>
            </div>
          );
        })}
        <div className="px-4 py-2 text-right text-[11px] text-mute">
          times in your timezone · {tz}
        </div>
      </div>
    </div>
  );
}
