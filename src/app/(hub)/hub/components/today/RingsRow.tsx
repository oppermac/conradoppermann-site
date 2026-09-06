import Link from "next/link";
import type { TodayData } from "@/lib/hub/queries/today";
import { DomainRing } from "../viz/DomainRing";
import { RAGChip } from "../viz/RAGChip";

type ConnectedToday = Extract<TodayData, { dbConnected: true }>;

/** Four domain rings, 64px on mobile and 96px on desktop (rendered twice, one hidden per breakpoint). */
export function RingsRow({ rings }: { rings: ConnectedToday["rings"] }) {
  return (
    <div className="hub-card p-5">
      <h2 className="hub-eyebrow">Domains</h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {rings.map((r) => {
          const pct = Math.round(r.progress * 100);
          const center = <span className="hub-tabular text-[13px] font-bold text-ink">{pct}%</span>;
          const ariaLabel = `${r.label}: ${pct} percent`;
          return (
            <Link key={r.domain} href={`/hub/week#${r.domain}`} className="hub-press flex flex-col items-center gap-1.5 text-center">
              <span className="lg:hidden">
                <DomainRing domain={r.domain} progress={r.progress} size={64} center={center} ariaLabel={ariaLabel} />
              </span>
              <span className="hidden lg:inline-block">
                <DomainRing domain={r.domain} progress={r.progress} size={96} center={center} ariaLabel={ariaLabel} />
              </span>
              <div className="text-[12px] font-semibold text-ink">{r.label}</div>
              <div className="line-clamp-2 text-[11px] leading-snug text-ink-3">{r.summary}</div>
              <RAGChip rag={r.rag} size={11} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
