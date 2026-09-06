"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { ProgrammeData } from "@/lib/hub/queries/programme";
import type { MondayItem } from "@/lib/hub/monday/sync";

type ConnectedProgramme = Extract<ProgrammeData, { dbConnected: true }>;

const STATUS_CLS: Record<string, string> = {
  Done: "bg-good/12 text-good",
  "In Progress": "bg-tint/12 text-tint",
  Stuck: "bg-bad/12 text-bad",
  "Not Started": "bg-ink/6 text-ink-3",
};

function StatusChip({ status }: { status: string }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[status] ?? "bg-ink/6 text-ink-3"}`}>{status}</span>;
}

function ItemRow({ item }: { item: MondayItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-hairline py-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        {item.subitems.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${item.name}`}
            className="hub-press flex h-6 w-6 shrink-0 items-center justify-center text-ink-3"
          >
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        ) : (
          <span className="w-6 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{item.name}</span>
        <StatusChip status={item.status} />
        <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.name} in Monday`} className="hub-press shrink-0 p-1 text-ink-3">
          <ExternalLink size={14} aria-hidden />
        </a>
      </div>
      {open && item.subitems.length > 0 ? (
        <ul className="ml-8 mt-1.5 flex flex-col gap-1">
          {item.subitems.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-[13px] text-ink-2">
              <span className="min-w-0 truncate">{s.name}</span>
              {s.status ? <StatusChip status={s.status} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function fmtSynced(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Dublin" });
}

/** Goals and Rocks mirrored from Monday, with a manual "Sync now" that POSTs /hub/api/monday/sync. */
export function RoadmapMirror({ roadmap }: { roadmap: ConnectedProgramme["roadmap"] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function syncNow() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/hub/api/monday/sync", { method: "POST" });
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Sync failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="hub-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="hub-eyebrow">Roadmap 2026</h2>
        <button
          type="button"
          onClick={syncNow}
          disabled={syncing}
          className="hub-press flex min-h-9 items-center rounded-full border border-hairline px-3.5 text-[13px] font-semibold text-ink-2 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>
      {error ? <p className="mt-1 text-[13px] text-bad">{error}</p> : null}
      {!roadmap ? (
        <p className="mt-2 text-[15px] text-ink-2">Nothing synced from Monday yet.</p>
      ) : (
        <>
          <div className="mt-3">
            <div className="text-[13px] font-semibold text-ink-2">Goals</div>
            <div className="mt-1">
              {roadmap.goals.map((it) => (
                <ItemRow key={it.id} item={it} />
              ))}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[13px] font-semibold text-ink-2">Rocks</div>
            <div className="mt-1">
              {roadmap.rocks.map((it) => (
                <ItemRow key={it.id} item={it} />
              ))}
            </div>
          </div>
          <div className="mt-3 text-[12px] text-ink-3">synced {fmtSynced(roadmap.fetchedAt)}</div>
        </>
      )}
    </section>
  );
}
