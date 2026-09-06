import type { ProgrammeData } from "@/lib/hub/queries/programme";
import { RAGChip } from "../viz/RAGChip";

type ConnectedProgramme = Extract<ProgrammeData, { dbConnected: true }>;
type DomainEntry = ConnectedProgramme["domains"][number];

/** One domain's outcome, this week's behaviour counts, cumulative weeks-on-track, and a progress sentence. */
export function DomainProgressCard({ entry }: { entry: DomainEntry }) {
  return (
    <section className="hub-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-ink">{entry.label}</div>
          <RAGChip rag={entry.rag} />
        </div>
        <div className="shrink-0 text-right">
          <div className="hub-tabular text-[20px] font-semibold text-ink">
            {entry.weeksOnTrack}/{entry.weeksElapsed}
          </div>
          <div className="text-[11px] text-ink-3">weeks on track</div>
        </div>
      </div>
      <p className="mt-2 text-[13px] italic leading-snug text-ink-2">{entry.outcome}</p>
      <div className="mt-3 flex flex-col divide-y divide-hairline">
        {entry.behaviours.map((b) => (
          <div key={b.id} className="flex items-center justify-between py-1.5 text-[13px] first:pt-0 last:pb-0">
            <span className="font-medium text-ink-2">{b.label}</span>
            <span className="hub-tabular text-ink">
              {b.done}/{b.target}
              {b.scheduled > 0 ? <span className="text-ink-3"> · +{b.scheduled}</span> : null}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-hairline pt-3 text-[13px] leading-snug text-ink-2">{entry.progressStatement}</p>
    </section>
  );
}
