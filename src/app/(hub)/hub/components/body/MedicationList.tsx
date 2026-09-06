"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useLogSheet } from "../sheet/LogSheetProvider";

export type MedRow = { id: string; name: string; dose: string | null; takenAt: string; day: string };

export function MedicationList({ entries }: { entries: MedRow[] }) {
  const { open } = useLogSheet();
  const router = useRouter();
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="hub-eyebrow">Medication</h2>
        <button type="button" onClick={() => open("medication")} className="hub-press flex h-9 items-center gap-1 rounded-full border border-hairline px-3 text-[13px] font-semibold text-tint">
          <Plus size={14} aria-hidden /> Add
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-2">Nothing logged in the last 30 days.</p>
      ) : (
        <ul className="mt-2 divide-y divide-hairline">
          {entries.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[15px]">
                  {m.name}
                  {m.dose ? <span className="text-ink-2"> · {m.dose}</span> : null}
                </div>
                <div className="hub-tabular text-[12px] text-ink-3">{new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(m.takenAt))}</div>
              </div>
              <button
                type="button"
                className="hub-press text-[13px] text-ink-3"
                onClick={async () => {
                  await fetch(`/hub/api/medications/${m.id}`, { method: "DELETE" });
                  router.refresh();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
