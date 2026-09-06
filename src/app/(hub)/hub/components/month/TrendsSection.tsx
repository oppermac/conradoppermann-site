import type { MonthData } from "@/lib/hub/queries/month";
import { TrendSparkline } from "../viz/TrendSparkline";

type ConnectedMonth = Extract<MonthData, { dbConnected: true }>;

function TrendRow({
  label,
  points,
  unit,
  decimals = 0,
  invert = false,
  neutral = false,
  latestOverride,
}: {
  label: string;
  points: Array<number | null>;
  unit: string;
  decimals?: number;
  invert?: boolean;
  neutral?: boolean;
  latestOverride?: number | null;
}) {
  const nonNull = points.map((p, i) => (p === null ? null : { i, v: p })).filter((x): x is { i: number; v: number } => x !== null);
  const latest = latestOverride ?? (nonNull.length ? nonNull[nonNull.length - 1].v : null);
  const prior = nonNull.length >= 5 ? nonNull[nonNull.length - 5].v : nonNull.length ? nonNull[0].v : null;
  const delta = latest !== null && prior !== null ? latest - prior : null;
  const deltaGood = neutral || delta === null ? null : invert ? delta < 0 : delta > 0;
  const fmt = (v: number) => v.toFixed(decimals);
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink-2">{label}</div>
        <div className="hub-tabular mt-0.5 text-[19px] font-semibold text-ink">{latest !== null ? `${fmt(latest)}${unit}` : "–"}</div>
        {delta !== null ? (
          <div className={`hub-tabular text-[12px] font-medium ${deltaGood === null ? "text-ink-3" : deltaGood ? "text-good" : "text-bad"}`}>
            {delta > 0 ? "+" : ""}
            {fmt(delta)}
            {unit} / 4 weeks
          </div>
        ) : (
          <div className="text-[12px] text-ink-3">Not enough data yet</div>
        )}
      </div>
      <TrendSparkline points={points} width={104} height={32} />
    </div>
  );
}

/** Five rolling 12-week trends: recovery, sleep consistency, RHR, bedtime consistency, weight. */
export function TrendsSection({ trends }: { trends: ConnectedMonth["trends"] }) {
  const weeks = trends.weeks;
  return (
    <section className="hub-card p-5">
      <h2 className="hub-eyebrow">Trends</h2>
      <div className="mt-1 divide-y divide-hairline">
        <TrendRow label="Recovery" points={weeks.map((w) => w.meanRecovery)} unit="%" />
        <TrendRow label="Sleep consistency" points={weeks.map((w) => w.meanSleepConsistency)} unit="%" />
        <TrendRow label="Resting heart rate" points={weeks.map((w) => w.meanRhr)} unit=" bpm" invert />
        <TrendRow label="Bedtime consistency" points={weeks.map((w) => w.bedtimeStdDevMin)} unit=" min" invert />
        <TrendRow label="Weight" points={weeks.map((w) => w.meanWeightKg)} unit=" kg" decimals={1} neutral latestOverride={trends.latestWeight} />
      </div>
    </section>
  );
}
