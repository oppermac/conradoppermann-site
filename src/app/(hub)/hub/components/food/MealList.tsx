"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils } from "lucide-react";
import { Toast, type ToastState } from "../sheet/Toast";

export type MealRow = {
  id: string;
  name: string;
  slot: string;
  eatenAt: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  photoUrl: string | null;
  confidence: number | null;
  items: Array<{ name: string; portion: string | null; grams: number | null; kcal: number; proteinG: number; carbsG: number; fatG: number }>;
};

function time(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function MealList({ meals }: { meals: MealRow[] }) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);

  async function repeat(m: MealRow) {
    const res = await fetch(`/hub/api/meals/${m.id}/repeat`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok || !data.id) return setToast({ message: data.error ?? "Couldn’t repeat that." });
    const id = data.id;
    setToast({ message: `Logged ${m.name}`, undo: async () => fetch(`/hub/api/meals/${id}`, { method: "DELETE" }).then(() => router.refresh()) });
    router.refresh();
  }

  async function remove(m: MealRow) {
    await fetch(`/hub/api/meals/${m.id}`, { method: "DELETE" });
    setToast({
      message: `Deleted ${m.name}`,
      undo: async () => {
        await fetch("/hub/api/meals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: m.name, slot: m.slot, eatenAt: m.eatenAt, photoUrl: m.photoUrl, source: "repeat", items: m.items, kcal: m.kcal, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG, confidence: m.confidence }),
        });
        router.refresh();
      },
    });
    router.refresh();
  }

  if (meals.length === 0) return <p className="text-[15px] text-ink-2">No meals yet today.</p>;
  return (
    <div>
      <ul className="divide-y divide-hairline">
        {meals.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-3">
            {m.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-[10px] object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-body/10 text-body">
                <Utensils size={20} aria-hidden />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{m.name}</div>
              <div className="hub-tabular text-[13px] text-ink-2">
                {time(m.eatenAt)} · {m.kcal} kcal · P {Math.round(m.proteinG)} C {Math.round(m.carbsG)} F {Math.round(m.fatG)}
              </div>
            </div>
            <details className="relative shrink-0">
              <summary className="hub-press flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-[18px] text-ink-2" aria-label={`Actions for ${m.name}`}>
                ⋯
              </summary>
              <div className="hub-elevated absolute right-0 z-10 mt-1 flex w-40 flex-col p-1 text-[15px]">
                <button type="button" className="hub-press rounded-control px-3 py-2 text-left" onClick={() => repeat(m)}>
                  Repeat
                </button>
                <button type="button" className="hub-press rounded-control px-3 py-2 text-left text-bad" onClick={() => remove(m)}>
                  Delete
                </button>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
