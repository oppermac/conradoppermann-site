import { DomainRing } from "../viz/DomainRing";
import { RAGChip } from "../viz/RAGChip";
import { SyncMondayButton } from "./SyncMondayButton";
import type { ProgrammeData } from "@/lib/hub/queries/programme";
import type { MondayItem } from "@/lib/hub/monday/sync";

type Connected = Extract<ProgrammeData, { dbConnected: true }>;

const STATUS_CLASS: Record<string, string> = {
  Done: "text-good",
  "In Progress": "text-tint",
  Stuck: "text-bad",
  "Not Started": "text-ink-3",
};

function RoadmapGroup({ title, items }: { title: string; items: MondayItem[] }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-ink-2">{title}</div>
      <ul className="mt-1 divide-y divide-hairline rounded-tile border border-hairline">
        {items.map((it) => (
          <li key={it.id} className="px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <a href={it.url} target="_blank" rel="noopener noreferrer" className="hub-press min-w-0 truncate text-[15px] text-ink">
                {it.name}
              </a>
              <span className={`shrink-0 text-[12px] font-semibold ${STATUS_CLASS[it.status] ?? "text-ink-3"}`}>{it.status}</span>
            </div>
            {it.subitems.length ? (
              <details className="mt-1">
                <summary className="cursor-pointer text-[12px] text-ink-3">{it.subitems.length} subitems</summary>
                <ul className="mt-1 space-y-0.5 pl-3 text-[13px] text-ink-2">
                  {it.subitems.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span className="truncate">{s.name}</span>
                      <span className="shrink-0 text-ink-3">{s.status ?? ""}{s.date ? ` · ${s.date}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? <li className="px-3 py-2 text-[13px] text-ink-3">Nothing here yet.</li> : null}
      </ul>
    </div>
  );
}

export function ProgrammeView({ data }: { data: Connected }) {
  const fetched = data.roadmap ? new Date(data.roadmap.fetchedAt) : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {data.domains.map((d) => (
          <section key={d.domain} className="hub-card p-5">
            <div className="flex items-start gap-4">
              <DomainRing domain={d.domain} progress={d.weeksElapsed ? d.weeksOnTrack / d.weeksElapsed : 0} size={64} stroke={8} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[17px] font-semibold">{d.label}</h2>
                  <RAGChip rag={d.rag} />
                </div>
                <p className="mt-1 text-[15px] leading-snug text-ink-2">{d.outcome}</p>
                <p className="mt-2 text-[13px] text-ink-2">{d.progressStatement}</p>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-hairline rounded-tile border border-hairline">
              {d.behaviours.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[15px]">
                  <span className="min-w-0 truncate">{b.label}</span>
                  <span className="hub-tabular shrink-0 text-ink-2">
                    {b.done}/{b.target}
                    {b.scheduled > 0 ? <span className="text-ink-3"> +{b.scheduled} booked</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="hub-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="hub-eyebrow">Roadmap 2026</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {fetched ? `Synced ${fetched.toLocaleString("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}` : "Not synced yet"}
            </p>
          </div>
          <SyncMondayButton />
        </div>
        {data.roadmap ? (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RoadmapGroup title={`Q4 Rocks · ${data.roadmap.summary.rocks.done}/${data.roadmap.summary.rocks.total} done${data.roadmap.summary.rocks.stuck ? ` · ${data.roadmap.summary.rocks.stuck} stuck` : ""}`} items={data.roadmap.rocks} />
            <RoadmapGroup title={`1-year goals · ${data.roadmap.summary.goals.done}/${data.roadmap.summary.goals.total} done`} items={data.roadmap.goals} />
          </div>
        ) : (
          <p className="mt-3 text-[15px] text-ink-2">Add the Monday token in Vercel and press Sync now.</p>
        )}
      </section>
    </div>
  );
}
