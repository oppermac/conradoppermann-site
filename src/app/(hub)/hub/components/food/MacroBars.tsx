type Totals = { kcal: number; proteinG: number; carbsG: number; fatG: number; meals?: number };
type Targets = { kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null };

function Bar({ value, target, colorVar, opacity = 1 }: { value: number; target: number | null; colorVar: string; opacity?: number }) {
  const pct = target ? Math.min(1.25, value / target) : 0;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-ink/10" aria-hidden>
      {target ? <div className="absolute inset-y-0 bg-ink/10" style={{ left: `${(0.9 / 1.25) * 100}%`, width: `${(0.2 / 1.25) * 100}%` }} /> : null}
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(pct / 1.25) * 100}%`, background: `var(${colorVar})`, opacity }} />
    </div>
  );
}

/** Energy hero bar with the ±10 % band drawn as a subtle range, plus three macro bars vs targets. */
export function KcalBar({ totals, targets }: { totals: Totals; targets: Targets }) {
  const left = targets.kcal ? targets.kcal - totals.kcal : null;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="hub-tabular text-[34px] font-semibold leading-none tracking-[-0.02em]">{totals.kcal.toLocaleString("en-GB")}</span>
          <span className="text-[13px] text-ink-3">kcal{targets.kcal ? ` of ${targets.kcal.toLocaleString("en-GB")}` : ""}</span>
        </div>
        {left !== null ? <span className="hub-tabular text-[13px] font-semibold text-ink-2">{left >= 0 ? `${left.toLocaleString("en-GB")} left` : `${Math.abs(left).toLocaleString("en-GB")} over`}</span> : null}
      </div>
      <div className="mt-2">
        <Bar value={totals.kcal} target={targets.kcal} colorVar="--hub-body" />
      </div>
    </div>
  );
}

export function MacroBars({ totals, targets }: { totals: Totals; targets: Targets }) {
  const rows: Array<{ label: string; value: number; target: number | null; opacity: number }> = [
    { label: "Protein", value: totals.proteinG, target: targets.proteinG, opacity: 1 },
    { label: "Carbs", value: totals.carbsG, target: targets.carbsG, opacity: 0.7 },
    { label: "Fat", value: totals.fatG, target: targets.fatG, opacity: 0.45 },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-ink-2">{r.label}</span>
            <span className="hub-tabular text-ink-2">
              {Math.round(r.value)}
              {r.target ? ` / ${Math.round(r.target)}` : ""} g
            </span>
          </div>
          <Bar value={r.value} target={r.target} colorVar="--hub-body" opacity={r.opacity} />
        </div>
      ))}
    </div>
  );
}
