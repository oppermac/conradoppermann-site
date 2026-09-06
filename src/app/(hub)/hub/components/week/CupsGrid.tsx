import type { WeekData } from "@/lib/hub/queries/week";
import { CUPS } from "@/lib/hub/domain/activity-types";
import { NeuroCup } from "../viz/NeuroCup";

type ConnectedWeek = Extract<WeekData, { dbConnected: true }>;

/** Cups 3×2, this week's fills. Anchor target for the Cups tap-through from Today. */
export function CupsGrid({ cups }: { cups: ConnectedWeek["cups"] }) {
  const ordered = CUPS.map((c) => cups.find((x) => x.cup === c)).filter((c): c is ConnectedWeek["cups"][number] => Boolean(c));
  return (
    <section id="cups" className="hub-card scroll-mt-20 p-5">
      <h2 className="hub-eyebrow">Cups</h2>
      {ordered.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-2">No cup data for this week.</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-y-5">
          {ordered.map((c) => (
            <div key={c.cup} className="flex justify-center">
              <NeuroCup cup={c.cup} drops={c.drops} capacity={c.capacity} size={48} attention={c.low} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
