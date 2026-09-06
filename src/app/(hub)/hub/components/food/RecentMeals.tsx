"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils } from "lucide-react";
import { Toast, type ToastState } from "../sheet/Toast";

export type RecentMeal = { name: string; count: number; lastId: string; lastAt: string; kcal: number; photoUrl: string | null };

/** One-tap repeat of a recent meal; most frequent first. */
export function RecentMeals({ recent: initial, compact = false }: { recent?: RecentMeal[]; compact?: boolean }) {
  const router = useRouter();
  const [recent, setRecent] = useState<RecentMeal[]>(initial ?? []);
  const [loaded, setLoaded] = useState(Boolean(initial));
  const [toast, setToast] = useState<ToastState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    fetch("/hub/api/meals")
      .then((r) => r.json())
      .then((d: { recent?: RecentMeal[] }) => {
        if (cancelled) return;
        setRecent(d.recent ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [initial]);

  async function repeat(m: RecentMeal) {
    setBusyId(m.lastId);
    const res = await fetch(`/hub/api/meals/${m.lastId}/repeat`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
    setBusyId(null);
    if (!res.ok || !data.id) {
      setToast({ message: data.error ?? "Couldn’t repeat that." });
      return;
    }
    const id = data.id;
    setToast({ message: `Logged ${m.name}`, undo: async () => fetch(`/hub/api/meals/${id}`, { method: "DELETE" }).then(() => router.refresh()) });
    router.refresh();
  }

  if (loaded && recent.length === 0) return <p className="text-[15px] text-ink-2">No meals yet — log the first with a photo.</p>;
  return (
    <div>
      <div className={`flex gap-3 overflow-x-auto pb-1 ${compact ? "" : "-mx-1 px-1"}`}>
        {recent.map((m) => (
          <button key={m.lastId} type="button" disabled={busyId === m.lastId} onClick={() => repeat(m)} className="hub-press hub-elevated flex w-[132px] shrink-0 flex-col items-start gap-2 p-2.5 text-left disabled:opacity-50">
            {m.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.photoUrl} alt="" className="aspect-[4/3] w-full rounded-[10px] object-cover" />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[10px] bg-body/10 text-body">
                <Utensils size={22} aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{m.name}</div>
              <div className="hub-tabular text-[12px] text-ink-3">
                {m.kcal} kcal · ×{m.count}
              </div>
            </div>
          </button>
        ))}
        {!loaded ? <div className="text-[13px] text-ink-3">Loading…</div> : null}
      </div>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
