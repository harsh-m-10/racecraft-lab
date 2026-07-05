const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Diverging bar around the 50-point league average (scores live on a 50±10 scale). */
export function ScoreBar({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="h-1.5 w-full rounded-full bg-card-2" />;
  }
  // Map 20..80 onto 0..100% of the track; 50 sits at the midpoint.
  const pos = clamp(((value - 20) / 60) * 100, 0, 100);
  const mid = 50;
  const left = Math.min(pos, mid);
  const width = Math.abs(pos - mid);
  const above = value >= 50;
  return (
    <div className="relative h-1.5 w-full rounded-full bg-card-2">
      <div
        className={`absolute top-0 h-full ${above ? "rounded-r-full bg-blue" : "rounded-l-full bg-brand/80"}`}
        style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
      />
      <div className="absolute top-[-2px] left-1/2 h-[10px] w-px bg-mute/60" />
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: number | null;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-mute">
        {label}
      </span>
      <span
        className={`num text-2xl font-bold ${accent ? "text-brand" : ""} ${value === null ? "text-mute" : ""}`}
      >
        {value === null ? "—" : value.toFixed(1)}
      </span>
      <ScoreBar value={value} />
      {hint ? <span className="text-xs text-mute">{hint}</span> : null}
    </div>
  );
}
