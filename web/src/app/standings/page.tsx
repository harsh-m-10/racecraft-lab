import type { Metadata } from "next";
import { getStandings } from "@/lib/data";
import { teamColor } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Standings",
  description:
    "Formula 1 championship standings — drivers and constructors, updated after every session.",
};

export default function StandingsPage() {
  const s = getStandings();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="kicker">
          {s.season} championship · after {s.rounds_completed}{" "}
          {s.rounds_completed === 1 ? "round" : "rounds"}
        </p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">
          Standings
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Drivers</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-mute">
                  <th className="w-10 px-3 py-2.5 font-medium">Pos</th>
                  <th className="px-3 py-2.5 font-medium">Driver</th>
                  <th className="px-3 py-2.5 text-right font-medium">Wins</th>
                  <th className="px-3 py-2.5 text-right font-medium">Podiums</th>
                  <th className="px-3 py-2.5 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {s.drivers.map((d) => (
                  <tr
                    key={d.driver_id}
                    className="border-b border-line/50 last:border-0"
                  >
                    <td className="num px-3 py-2 font-bold text-ink-2">
                      {d.position}
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="inline-block h-4 w-1 rounded-sm"
                          style={{ background: teamColor(d.team) }}
                        />
                        <span className="font-medium">{d.driver}</span>
                        <span className="hidden text-xs text-mute sm:inline">
                          {d.team}
                        </span>
                      </span>
                    </td>
                    <td className="num px-3 py-2 text-right text-ink-2">
                      {d.wins || ""}
                    </td>
                    <td className="num px-3 py-2 text-right text-ink-2">
                      {d.podiums || ""}
                    </td>
                    <td className="num px-3 py-2 text-right font-bold">
                      {d.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Constructors</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-mute">
                  <th className="w-10 px-3 py-2.5 font-medium">Pos</th>
                  <th className="px-3 py-2.5 font-medium">Team</th>
                  <th className="px-3 py-2.5 text-right font-medium">Wins</th>
                  <th className="px-3 py-2.5 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {s.constructors.map((c) => (
                  <tr
                    key={c.team}
                    className="border-b border-line/50 last:border-0"
                  >
                    <td className="num px-3 py-2 font-bold text-ink-2">
                      {c.position}
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="inline-block h-4 w-1 rounded-sm"
                          style={{ background: teamColor(c.team) }}
                        />
                        <span className="font-medium">{c.team}</span>
                      </span>
                    </td>
                    <td className="num px-3 py-2 text-right text-ink-2">
                      {c.wins || ""}
                    </td>
                    <td className="num px-3 py-2 text-right font-bold">
                      {c.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-mute">
            Points from official race and sprint classifications.
          </p>
        </section>
      </div>
    </div>
  );
}
