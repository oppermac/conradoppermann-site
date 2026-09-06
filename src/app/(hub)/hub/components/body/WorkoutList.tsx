"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";

export type WorkoutRow = { id: string; day: string; start: string; sport: string | null; kind: string; override: string | null; minutes: number; strain: number | null; counts: boolean; state: string | null };

const KINDS = ["cardio", "strength", "mixed", "mobility", "movement", "leisure", "recovery", "other"];

function label(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function WorkoutList({ workouts }: { workouts: WorkoutRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function reclassify(id: string, kind: string) {
    setBusy(id);
    await fetch(`/hub/api/whoop/workouts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) });
    setBusy(null);
    router.refresh();
  }
  if (workouts.length === 0) return <p className="text-[15px] text-ink-2">No workouts in the last two weeks.</p>;
  return (
    <ul className="divide-y divide-hairline">
      {workouts.map((w) => (
        <li key={w.id} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-semibold">{w.sport ?? "Workout"}</span>
              {w.counts ? <CircleCheck size={14} className="shrink-0 text-good" aria-label="Counts as a session" /> : null}
            </div>
            <div className="hub-tabular text-[13px] text-ink-2">
              {label(w.day)} · {w.minutes} min{w.strain ? ` · strain ${w.strain.toFixed(1)}` : ""}{w.state === "PENDING_SCORE" ? " · pending" : ""}
            </div>
          </div>
          <select aria-label={`Kind for ${w.sport ?? "workout"}`} value={w.override ?? w.kind} disabled={busy === w.id} onChange={(e) => reclassify(w.id, e.target.value)} className="h-9 rounded-control border border-hairline bg-card px-2 text-[13px] capitalize">
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}
