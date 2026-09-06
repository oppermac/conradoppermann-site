import { minutesFrom18 } from "@/lib/hub/time";

export type Night = { day: string; bedtime: string | null; wake: string | null; lightMs: number; swsMs: number; remMs: number; awakeMs: number; performance: number | null; status: "early" | "in" | "late" | null };

const AXIS_START = 20 * 60; // 20:00
const AXIS_END = (24 + 10) * 60; // 10:00 next day

function pos(hhmm: string): number {
  const m = minutesFrom18(hhmm) + 18 * 60; // minutes since 18:00 → absolute on a 18:00-based axis
  return Math.max(0, Math.min(1, (m - AXIS_START) / (AXIS_END - AXIS_START)));
}

/** Seven nights on a 20:00–10:00 axis: stage steps in the body hue, the bedtime window as a soft band. */
export function SleepBar({ nights, window, consistency }: { nights: Night[]; window: { start: string; end: string }; consistency: number | null }) {
  const w = 600;
  const rowH = 22;
  const h = nights.length * rowH + 24;
  const bandL = pos(window.start) * w;
  const bandR = pos(window.end) * w;
  const ticks = ["20:00", "22:00", "00:00", "02:00", "04:00", "06:00", "08:00", "10:00"];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold text-ink-2">Last seven nights</h3>
        {consistency !== null ? <span className="hub-tabular text-[13px] text-ink-2">Consistency {Math.round(consistency)}%</span> : null}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full" role="img" aria-label="Bedtimes and sleep stages for the last seven nights">
        <rect x={bandL} y={0} width={Math.max(2, bandR - bandL)} height={h - 18} fill="var(--hub-body)" fillOpacity={0.12} />
        {nights.map((n, i) => {
          if (!n.bedtime || !n.wake) return null;
          const x1 = pos(n.bedtime) * w;
          const x2 = pos(n.wake) * w;
          const total = n.lightMs + n.swsMs + n.remMs + n.awakeMs || 1;
          const y = i * rowH + 4;
          let x = x1;
          const segs = [
            { ms: n.swsMs, op: 1 },
            { ms: n.remMs, op: 0.7 },
            { ms: n.lightMs, op: 0.45 },
            { ms: n.awakeMs, op: 0 },
          ];
          return (
            <g key={n.day}>
              {segs.map((s, j) => {
                const wid = ((x2 - x1) * s.ms) / total;
                const el = s.op > 0 ? <rect key={j} x={x} y={y} width={Math.max(0, wid)} height={rowH - 8} rx={3} fill="var(--hub-body)" fillOpacity={s.op} /> : null;
                x += wid;
                return el;
              })}
              <text x={Math.min(w - 4, x2 + 6)} y={y + rowH - 11} fontSize={10} fill="var(--hub-ink-3)" className="hub-tabular">
                {n.bedtime}
              </text>
            </g>
          );
        })}
        {ticks.map((t) => (
          <text key={t} x={pos(t) * w} y={h - 4} fontSize={10} textAnchor="middle" fill="var(--hub-ink-3)">
            {t}
          </text>
        ))}
      </svg>
      <p className="mt-1 text-[12px] text-ink-3">Darker is deep sleep, lighter is REM and light sleep. The shaded band is your bedtime window.</p>
    </div>
  );
}
