/** Pure SVG sparkline: 2 px line, last-point marker, optional target band. Colour follows the entity. */
export function TrendSparkline({
  points,
  width = 120,
  height = 36,
  color = "var(--hub-ink-3)",
  accent = "var(--hub-tint)",
  band,
  ariaLabel,
}: {
  points: Array<number | null>;
  width?: number;
  height?: number;
  color?: string;
  accent?: string;
  band?: { min: number; max: number };
  ariaLabel?: string;
}) {
  const vals = points.filter((p): p is number => p !== null && Number.isFinite(p));
  if (vals.length < 2) return <svg width={width} height={height} role="img" aria-label={ariaLabel ?? "Not enough data"} />;
  const lo = Math.min(...vals, band?.min ?? Infinity);
  const hi = Math.max(...vals, band?.max ?? -Infinity);
  const span = hi - lo || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - lo) / span) * (height - pad * 2);
  let d = "";
  points.forEach((p, i) => {
    if (p === null || !Number.isFinite(p)) return;
    d += `${d ? " L" : "M"} ${x(i).toFixed(1)} ${y(p).toFixed(1)}`;
  });
  const lastIdx = points.length - 1 - [...points].reverse().findIndex((p) => p !== null && Number.isFinite(p));
  const last = points[lastIdx] as number;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel ?? `Trend, latest ${last}`}>
      {band ? <rect x={0} y={y(band.max)} width={width} height={Math.max(1, y(band.min) - y(band.max))} fill={accent} fillOpacity={0.1} /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(lastIdx)} cy={y(last)} r={3.5} fill={accent} />
    </svg>
  );
}
