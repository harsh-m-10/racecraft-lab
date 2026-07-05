import Link from "next/link";

export interface BarRow {
  label: string;
  value: number;
  display: string;
  slug?: string;
  sub?: string;
}

function Label({ row }: { row: BarRow }) {
  const text = (
    <span className="truncate text-[13px] text-ink-2" title={row.label}>
      {row.label}
      {row.sub ? <span className="ml-1.5 text-mute">{row.sub}</span> : null}
    </span>
  );
  return row.slug ? (
    <Link
      href={`/drivers/${row.slug}`}
      className="min-w-0 hover:underline underline-offset-2"
    >
      {text}
    </Link>
  ) : (
    <span className="min-w-0">{text}</span>
  );
}

/**
 * Horizontal bar list, single hue. Rows render in the order given
 * (put the best row first). Bars scale to the max |value|.
 */
export function BarList({
  rows,
  labelWidth = 180,
}: {
  rows: BarRow[];
  labelWidth?: number;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1e-9);
  return (
    <div
      className="grid items-center gap-x-3 gap-y-1.5"
      style={{
        gridTemplateColumns: `minmax(120px,${labelWidth}px) 1fr auto`,
      }}
    >
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <Label row={r} />
          <div className="h-4 rounded-sm bg-card-2">
            <div
              className="h-full rounded-sm bg-blue"
              style={{ width: `${Math.max((Math.abs(r.value) / max) * 100, 0.5)}%` }}
            />
          </div>
          <span className="num text-right text-[13px] text-ink-2">
            {r.display}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Diverging bar list around zero. Negative values draw left in blue
 * (better), positive right in brand red (worse) — or flipped via
 * `positiveIsGood`.
 */
export function DivergingBarList({
  rows,
  positiveIsGood = false,
  labelWidth = 180,
}: {
  rows: BarRow[];
  positiveIsGood?: boolean;
  labelWidth?: number;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1e-9);
  return (
    <div
      className="grid items-center gap-x-3 gap-y-1.5"
      style={{
        gridTemplateColumns: `minmax(120px,${labelWidth}px) 1fr auto`,
      }}
    >
      {rows.map((r) => {
        const good = positiveIsGood ? r.value >= 0 : r.value < 0;
        const pct = (Math.abs(r.value) / max) * 50;
        const right = r.value >= 0;
        return (
          <div key={r.label} className="contents">
            <Label row={r} />
            <div className="relative h-4 rounded-sm bg-card-2">
              <div className="absolute left-1/2 top-0 h-full w-px bg-mute/50" />
              <div
                className={`absolute top-0 h-full ${good ? "bg-blue" : "bg-brand/85"} ${right ? "rounded-r-sm" : "rounded-l-sm"}`}
                style={
                  right
                    ? { left: "50%", width: `${Math.max(pct, 0.4)}%` }
                    : { right: "50%", width: `${Math.max(pct, 0.4)}%` }
                }
              />
            </div>
            <span className="num text-right text-[13px] text-ink-2">
              {r.display}
            </span>
          </div>
        );
      })}
    </div>
  );
}
