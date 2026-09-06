import { ExternalLink } from "lucide-react";
import type { WeekData } from "@/lib/hub/queries/week";
import { ROADMAP_BOARD_ID } from "@/lib/hub/monday/sync";

type ConnectedWeek = Extract<WeekData, { dbConnected: true }>;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Dublin" });
}

/** Q4 rocks mini-panel: done/stuck counts, stuck + in-progress names as chips, a link out to Monday. */
export function RocksPanel({ rocks }: { rocks: ConnectedWeek["rocks"] }) {
  if (!rocks) {
    return (
      <section className="hub-card p-5">
        <div className="hub-eyebrow">Roadmap 2026</div>
        <p className="mt-1 text-[15px] text-ink-2">Nothing synced from Monday yet.</p>
      </section>
    );
  }
  const r = rocks.summary.rocks;
  const chips = [...rocks.stuck, ...rocks.inProgress];
  return (
    <section className="hub-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="hub-eyebrow">Roadmap 2026</div>
          <div className="mt-0.5 text-[16px] font-semibold text-ink">
            Q4 Rocks{" "}
            <span className="hub-tabular text-[14px] font-normal text-ink-2">
              · {r.done}/{r.total} done{r.stuck > 0 ? ` · ${r.stuck} stuck` : ""}
            </span>
          </div>
        </div>
        <a
          href={`https://mavericksocial.monday.com/boards/${ROADMAP_BOARD_ID}`}
          target="_blank"
          rel="noreferrer"
          className="hub-press flex shrink-0 items-center gap-1 py-1 text-[13px] font-semibold text-tint"
        >
          Open in Monday <ExternalLink size={12} aria-hidden />
        </a>
      </div>
      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((it) => (
            <span key={it.id} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${it.status === "Stuck" ? "bg-bad/12 text-bad" : "bg-tint/12 text-tint"}`}>
              {it.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 text-[12px] text-ink-3">synced {fmtTime(rocks.fetchedAt)}</div>
    </section>
  );
}
