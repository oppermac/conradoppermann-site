import Link from "next/link";
import { Plus, Utensils } from "lucide-react";
import type { TodayData } from "@/lib/hub/queries/today";

type ConnectedToday = Extract<TodayData, { dbConnected: true }>;

const SCALE_MAX = 1.3; // the bar's visual scale is 0–130% of target

function Bar({ label, value, target, unit, band }: { label: string; value: number; target: number; unit: string; band?: boolean }) {
  const ratio = target > 0 ? value / target : 0;
  const fill = Math.max(0, Math.min(1, ratio / SCALE_MAX)) * 100;
  const bandLo = (0.9 / SCALE_MAX) * 100;
  const bandHi = (1.1 / SCALE_MAX) * 100;
  const tick = Math.min(100, (1 / SCALE_MAX) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="font-semibold text-ink-2">{label}</span>
        <span className="hub-tabular text-ink-3">
          {Math.round(value)}
          {unit} / {Math.round(target)}
          {unit}
        </span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-ink/8">
        {band ? (
          <div className="absolute inset-y-0 rounded-full bg-tint/15" style={{ left: `${bandLo}%`, width: `${bandHi - bandLo}%` }} aria-hidden />
        ) : (
          <div className="absolute inset-y-0 w-px bg-ink-3/50" style={{ left: `${tick}%` }} aria-hidden />
        )}
        <div className="absolute inset-y-0 left-0 rounded-full bg-tint" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

/** Kcal (±10% band) and three macro bars vs today's targets, plus today's meal thumbnails. */
export function FoodStrip({ food }: { food: ConnectedToday["food"] }) {
  const { totals, targets, meals } = food;
  const hasTargets = targets.kcal !== null;

  return (
    <div className="hub-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="hub-eyebrow">Food</h2>
        <Link href="/hub/food" className="hub-press text-[13px] font-semibold text-tint">
          Open
        </Link>
      </div>
      {!hasTargets ? (
        <p className="mt-2 text-[15px] text-ink-2">Targets appear after the first Whoop week.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          <Bar label="Calories" value={totals.kcal} target={targets.kcal as number} unit=" kcal" band />
          <Bar label="Protein" value={totals.proteinG} target={targets.proteinG ?? 0} unit="g" />
          <Bar label="Carbs" value={totals.carbsG} target={targets.carbsG ?? 0} unit="g" />
          <Bar label="Fat" value={totals.fatG} target={targets.fatG ?? 0} unit="g" />
        </div>
      )}
      <div className="mt-3.5 flex items-center gap-2 overflow-x-auto">
        {meals.map((m) => (
          <div key={m.id} className="shrink-0" title={`${m.name} · ${m.kcal} kcal`}>
            {m.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.photoUrl} alt={m.name} className="h-10 w-10 rounded-full border border-hairline object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-elevated text-ink-2">
                <Utensils size={16} aria-hidden />
              </span>
            )}
          </div>
        ))}
        <Link
          href="/hub/food"
          aria-label="Add a meal"
          className="hub-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-hairline text-ink-3"
        >
          <Plus size={16} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
