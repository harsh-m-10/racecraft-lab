import { teamColor } from "@/lib/teams";
import type { QualiResultRow, RaceResultRow } from "@/lib/data";

function DriverCell({ driver, team }: { driver: string; team: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="inline-block h-4 w-1 rounded-sm"
        style={{ background: teamColor(team) }}
      />
      <span className="font-medium">{driver}</span>
      <span className="hidden text-xs text-mute sm:inline">{team}</span>
    </span>
  );
}

export function RaceTable({ rows }: { rows: RaceResultRow[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-mute">
            <th className="w-10 px-3 py-2.5 font-medium">Pos</th>
            <th className="px-3 py-2.5 font-medium">Driver</th>
            <th className="px-3 py-2.5 text-right font-medium">Grid</th>
            <th className="px-3 py-2.5 text-right font-medium">Status</th>
            <th className="px-3 py-2.5 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.position}-${r.driver}`}
              className={`border-b border-line/50 last:border-0 ${
                r.position === 1
                  ? "bg-accent/[0.07]"
                  : r.position <= 3
                    ? "bg-card-2/40"
                    : ""
              }`}
            >
              <td
                className={`num px-3 py-2 font-bold ${
                  r.position === 1 ? "text-accent" : "text-ink-2"
                }`}
              >
                {r.position}
              </td>
              <td className="px-3 py-2">
                <DriverCell driver={r.driver} team={r.team} />
              </td>
              <td className="num px-3 py-2 text-right text-ink-2">
                {r.grid ?? "—"}
              </td>
              <td className="px-3 py-2 text-right text-xs text-mute">
                {r.status === "Finished" ? "" : r.status}
              </td>
              <td className="num px-3 py-2 text-right font-semibold">
                {r.points > 0 ? r.points : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QualiTable({ rows }: { rows: QualiResultRow[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[460px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-mute">
            <th className="w-10 px-3 py-2.5 font-medium">Pos</th>
            <th className="px-3 py-2.5 font-medium">Driver</th>
            <th className="px-3 py-2.5 text-right font-medium">Q1</th>
            <th className="px-3 py-2.5 text-right font-medium">Q2</th>
            <th className="px-3 py-2.5 text-right font-medium">Q3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.position}-${r.driver}`}
              className="border-b border-line/50 last:border-0"
            >
              <td className="num px-3 py-2 font-bold text-ink-2">
                {r.position}
              </td>
              <td className="px-3 py-2">
                <DriverCell driver={r.driver} team={r.team} />
              </td>
              <td className="num px-3 py-2 text-right text-mute">
                {r.q1 ?? ""}
              </td>
              <td className="num px-3 py-2 text-right text-mute">
                {r.q2 ?? ""}
              </td>
              <td className="num px-3 py-2 text-right font-medium">
                {r.q3 ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PodiumStrip({
  rows,
  title,
}: {
  rows: RaceResultRow[];
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-mute">
        {title}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {rows.slice(0, 3).map((r) => (
          <div key={r.driver} className="flex items-center gap-2.5 text-sm">
            <span className="num w-5 font-black text-ink-2">{r.position}</span>
            <span
              className="inline-block h-3.5 w-1 rounded-sm"
              style={{ background: teamColor(r.team) }}
            />
            <span className="font-medium">{r.driver}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
