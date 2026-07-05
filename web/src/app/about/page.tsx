import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Racecraft is, where the data comes from, and how the Debrief works.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <p className="kicker">About</p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">
          Racecraft
        </h1>
      </div>

      <section className="flex flex-col gap-3 text-ink-2">
        <p>
          Racecraft is a fast, no-nonsense home for Formula 1: the race weekend
          schedule in your timezone, session results shortly after the
          chequered flag, championship standings, and the day&apos;s headlines
          — all on one page.
        </p>
        <p>
          Results and standings come from official timing data (via the
          open-source FastF1 project and the Jolpica API). Points are the real
          FIA points. Nothing is estimated.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">The Debrief</h2>
        <p className="text-ink-2">
          The one thing you won&apos;t find on other results sites. After every
          race we analyse each driver&apos;s laps and keep only the{" "}
          <strong>clean ones</strong> — green-flag running, no in/out laps, no
          traffic-compromised timing, dry conditions. The median of those laps
          is a driver&apos;s <em>true pace</em>, shown as a percentage gap to
          the fastest car. It regularly tells a different story from the
          finishing order — that&apos;s the point.
        </p>
        <p className="text-ink-2">
          The qualifying comparison uses the deepest session both teammates
          reached (Q3 if both made it, otherwise Q2, otherwise Q1) — the same
          car on the same day, the cleanest driver comparison in motorsport.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">News</h2>
        <p className="text-ink-2">
          Headlines are aggregated from BBC Sport, Autosport, RaceFans and
          Motorsport.com and always link to the original article.
        </p>
      </section>

      <p className="text-xs text-mute">
        Racecraft is an unofficial fan project and is not associated in any way
        with Formula 1, the FIA, or any team. F1 and Formula 1 are trademarks
        of Formula One Licensing B.V.
      </p>
    </div>
  );
}
