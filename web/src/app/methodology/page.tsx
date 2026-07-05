import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Racecraft Lab computes race pace, qualifying head-to-head, tyre management, launch rating and Power Score v2 from lap-level F1 timing data.",
};

const METRICS: { name: string; weight: string; body: string }[] = [
  {
    name: "Race pace",
    weight: "25%",
    body: "For every dry race we take each driver's median clean-lap time and express it as a % gap to the race-best median. A season score needs at least 10 clean laps per race and 5 races. This answers \"who actually had Sunday speed\" regardless of where they finished.",
  },
  {
    name: "Qualifying head-to-head",
    weight: "20%",
    body: "Teammates are compared in the deepest qualifying segment both reached (Q3 if both set times, else Q2, else Q1) — same car, same day, same fuel. The score blends the median % gap (70%) with the head-to-head win rate (30%).",
  },
  {
    name: "Delta score",
    weight: "20%",
    body: "The original Racecraft metric: how much a driver beats or loses to their grid slot, adjusted for teammate performance and starting position.",
  },
  {
    name: "Sunday edge",
    weight: "10%",
    body: "Race-day position gain blended with finishing consistency.",
  },
  {
    name: "Chaos index",
    weight: "10%",
    body: "Performance in high-DNF, wet, or heavily safety-car-interrupted races — who keeps their head when everything goes sideways.",
  },
  {
    name: "Tyre management",
    weight: "10%",
    body: "For every stint of 5+ clean laps we fit a line to lap time vs tyre age — the degradation rate in s/lap. Each driver is compared to their teammate on the same compound in the same race, which cancels fuel load and car spec.",
  },
  {
    name: "Launch rating",
    weight: "5%",
    body: "Positions gained or lost on lap 1, averaged across a season.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold">Methodology</h1>
        <p className="mt-3 text-ink-2">
          Racecraft Lab ingests every race, sprint and qualifying session since
          2018 via FastF1 — 270,000+ laps of timing data — and reduces it to a
          handful of transparent driver metrics. Every metric is z-normalized
          to a <span className="num">50±10</span> scale within its season, so
          scores are comparable across eras.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Clean laps only</h2>
        <p className="text-ink-2">
          All lap-based metrics use <strong>clean racing laps</strong>:
          timing-accurate laps under green flag, excluding in/out laps, deleted
          laps, and wet races. That strips traffic, safety cars, strategy and
          weather out of the comparison — what&apos;s left is car + driver
          speed.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Power Score v2 components</h2>
        <div className="flex flex-col gap-3">
          {METRICS.map((m) => (
            <div key={m.name} className="card flex flex-col gap-2 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{m.name}</h3>
                <span className="num rounded bg-card-2 px-2 py-0.5 text-xs font-semibold text-blue">
                  {m.weight}
                </span>
              </div>
              <p className="text-sm text-ink-2">{m.body}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-mute">
          Drivers without enough telemetry history (e.g. one-off substitutes)
          get league-average fills for missing metrics and are flagged{" "}
          <em>low data</em>. The original Power Score (v1) still exists in the
          data for continuity.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Philosophy</h2>
        <p className="text-ink-2">
          Racecraft Lab is designed to be a <strong>debate-starter</strong>,
          not a final answer. The metrics compress DNFs, weather and strategy
          into a few honest signals so you can compare drivers quickly — then
          dig into the races behind the numbers.
        </p>
      </section>
    </div>
  );
}
