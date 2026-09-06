import type { WeekData } from "@/lib/hub/queries/week";
import { DomainRing } from "../viz/DomainRing";
import { RAGChip } from "../viz/RAGChip";

type ConnectedWeek = Extract<WeekData, { dbConnected: true }>;
type DomainEntry = ConnectedWeek["domains"][number];
type Behaviour = DomainEntry["behaviours"][number];

function BehaviourRow({ b }: { b: Behaviour }) {
  const isSessions = b.id === "sessions";
  const countText = isSessions ? `${b.cardioDone ?? 0} cardio · ${b.strengthDone ?? 0} strength` : `${b.done}/${b.target}`;
  const scheduledSuffix = !isSessions && b.scheduled > 0 ? ` · +${b.scheduled} scheduled` : "";
  return (
    <div className="border-t border-hairline py-2.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
        <span className="font-semibold text-ink">{b.label}</span>
        {b.period === "month" ? <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-3">this month</span> : null}
        <span className="hub-tabular text-ink-2">
          · {countText}
          {scheduledSuffix}
        </span>
      </div>
      {b.evidence.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {b.evidence.slice(0, 3).map((e, i) => (
            <li key={i} className="truncate text-[12px] text-ink-3">
              {e}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** One domain's checklist: ring + RAG, then each behaviour with its count and up to three evidence lines. */
export function DomainChecklistCard({ entry }: { entry: DomainEntry }) {
  const pct = Math.round(entry.progress * 100);
  return (
    <section id={entry.domain} className="hub-card scroll-mt-20 p-5">
      <div className="flex items-center gap-3">
        <DomainRing
          domain={entry.domain}
          progress={entry.progress}
          size={56}
          center={<span className="hub-tabular text-[12px] font-bold text-ink">{pct}%</span>}
          ariaLabel={`${entry.label}: ${pct} percent`}
        />
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-ink">{entry.label}</div>
          <RAGChip rag={entry.rag} />
        </div>
      </div>
      <div className="mt-1">
        {entry.behaviours.map((b) => (
          <BehaviourRow key={b.id} b={b} />
        ))}
      </div>
    </section>
  );
}
