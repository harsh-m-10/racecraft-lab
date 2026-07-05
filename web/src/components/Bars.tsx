export interface BarRow {
  label: string;
  value: number;
  display: string;
  sub?: string;
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
          <span
            className="min-w-0 truncate text-[13px] text-ink-2"
            title={r.label}
          >
            {r.label}
            {r.sub ? <span className="ml-1.5 text-mute">{r.sub}</span> : null}
          </span>
          <div className="h-4 rounded-sm bg-card-2">
            <div
              className="h-full rounded-sm bg-accent/85"
              style={{
                width: `${Math.max((Math.abs(r.value) / max) * 100, 0.5)}%`,
              }}
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
