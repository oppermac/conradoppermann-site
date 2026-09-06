import { CUPS } from "@/lib/hub/domain/activity-types";
import type { MonthData } from "@/lib/hub/queries/month";
import { NeuroCup } from "../viz/NeuroCup";

type ConnectedMonth = Extract<MonthData, { dbConnected: true }>;

/** Six cups at their month fill, each with a row of small unlabelled mini-cups showing the week-by-week fill. */
export function CupsAggregate({ cups }: { cups: ConnectedMonth["cups"] }) {
  const ordered = CUPS.map((c) => cups.find((x) => x.cup === c)).filter((c): c is ConnectedMonth["cups"][number] => Boolean(c));
  const weeks = ordered[0]?.weeks ?? [];
  return (
    <section className="hub-card p-5">
      <h2 className="hub-eyebrow">Cups this month</h2>
      <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-6">
        {ordered.map((c) => (
          <div key={c.cup} className="flex flex-col items-center gap-2">
            <NeuroCup cup={c.cup} drops={c.drops} capacity={c.capacity} size={64} />
            <div className="flex items-center gap-1">
              {weeks.map((weekFills, i) => {
                const wf = weekFills.find((f) => f.cup === c.cup);
                return <NeuroCup key={i} cup={c.cup} drops={wf?.drops ?? 0} capacity={wf?.capacity ?? c.capacity} size={20} showLabel={false} />;
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
