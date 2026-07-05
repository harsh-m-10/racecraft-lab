import type { Metadata } from "next";
import Link from "next/link";
import { getAllDrivers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Drivers",
  description:
    "Every F1 driver since 2018, ranked by telemetry-based Power Score v2.",
};

export default function DriversPage() {
  const drivers = getAllDrivers();
  const active = drivers.filter((d) => d.is_active);
  const former = drivers.filter((d) => !d.is_active);

  const Card = ({ d }: { d: (typeof drivers)[number] }) => (
    <Link
      href={`/drivers/${d.slug}`}
      className="card group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:border-brand/60"
    >
      <div className="min-w-0">
        <p className="truncate font-medium group-hover:text-brand">
          {d.driver}
        </p>
        <p className="text-xs text-mute">
          {d.total_races} races · {d.seasons.length}{" "}
          {d.seasons.length === 1 ? "season" : "seasons"}
        </p>
      </div>
      <span className="num shrink-0 text-lg font-bold text-blue">
        {d.power_score_v2.toFixed(1)}
      </span>
    </Link>
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Drivers</h1>
        <p className="mt-2 text-ink-2">
          Everyone who has started an F1 race since 2018, ranked by Power Score
          v2.
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-mute">
          On the current grid
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((d) => (
            <Card key={d.slug} d={d} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-mute">
          Former drivers
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {former.map((d) => (
            <Card key={d.slug} d={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
