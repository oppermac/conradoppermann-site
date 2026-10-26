"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { slotForHour } from "@/lib/hub/meals/schema";
import { Toast, type ToastState } from "../sheet/Toast";
import { FoodPicker, type PickedItem } from "./FoodPicker";

type Slot = "breakfast" | "lunch" | "dinner" | "snack";
const SLOTS: Slot[] = ["breakfast", "lunch", "dinner", "snack"];

/** Pick foods and quantities from the library; totals add up as you go; one tap saves the meal. */
export function BuildMealPanel({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const [items, setItems] = useState<PickedItem[]>([]);
  const [picking, setPicking] = useState(true);
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<Slot>(() => slotForHour(new Date().getHours() + new Date().getMinutes() / 60));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const totals = useMemo(() => items.reduce((a, it) => ({ kcal: a.kcal + it.kcal, proteinG: a.proteinG + it.proteinG, carbsG: a.carbsG + it.carbsG, fatG: a.fatG + it.fatG }), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }), [items]);
  const autoName = items.map((i) => i.name.replace(/\s*\(.*\)$/, "")).slice(0, 3).join(", ") + (items.length > 3 ? ` +${items.length - 3}` : "");

  async function save() {
    if (!items.length) return;
    setBusy(true);
    setError(null);
    const body = {
      name: name.trim() || autoName,
      slot,
      source: "text",
      items: items.map(({ foodId: _f, ...it }) => it),
      foodIds: items.map((i) => i.foodId).filter(Boolean),
      kcal: Math.round(totals.kcal),
      proteinG: totals.proteinG,
      carbsG: totals.carbsG,
      fatG: totals.fatG,
      confidence: 0.9,
      notes: "Built from the food library.",
    };
    const res = await fetch("/hub/api/meals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    setBusy(false);
    if (!res.ok || !data.id) {
      setError(data.error ?? "Couldn’t save the meal.");
      return;
    }
    const id = data.id;
    setToast({ message: `Logged ${body.name}`, undo: async () => fetch(`/hub/api/meals/${id}`, { method: "DELETE" }).then(() => router.refresh()) });
    setItems([]);
    setName("");
    setPicking(true);
    router.refresh();
    onSaved?.();
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <ul className="divide-y divide-hairline">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium">{it.name}</div>
                <div className="hub-tabular text-[12.5px] text-ink-3">{it.portion} · {it.kcal} kcal · P {Math.round(it.proteinG)} C {Math.round(it.carbsG)} F {Math.round(it.fatG)}</div>
              </div>
              <button type="button" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} aria-label={`Remove ${it.name}`} className="hub-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3">
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {picking ? (
        <FoodPicker
          autoFocus={items.length === 0}
          onPick={(it) => {
            setItems((xs) => [...xs, it]);
            setPicking(false);
          }}
        />
      ) : (
        <button type="button" onClick={() => setPicking(true)} className="hub-press flex h-10 items-center justify-center gap-1.5 self-start rounded-full border border-hairline px-3.5 text-[14px] font-semibold text-ink-2">
          <Plus size={16} aria-hidden /> Add another
        </button>
      )}

      {items.length > 0 ? (
        <>
          <div className="hub-elevated flex items-center justify-between px-4 py-3 text-[15px]">
            <span className="font-semibold">Meal</span>
            <span className="hub-tabular text-ink-2">{Math.round(totals.kcal)} kcal · P {Math.round(totals.proteinG)} C {Math.round(totals.carbsG)} F {Math.round(totals.fatG)}</span>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={autoName} aria-label="Meal name" className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px] font-semibold" />
          <div className="hub-chrome grid grid-cols-4 rounded-control p-0.5" role="tablist" aria-label="Meal slot">
            {SLOTS.map((s) => (
              <button key={s} type="button" role="tab" aria-selected={slot === s} onClick={() => setSlot(s)} className={`h-9 rounded-[10px] text-[13px] font-semibold capitalize ${slot === s ? "bg-elevated text-ink shadow-sm" : "text-ink-2"}`}>
                {s}
              </button>
            ))}
          </div>
          {error ? <p className="text-[13px] text-bad">{error}</p> : null}
          <button type="button" disabled={busy} onClick={save} className="hub-press h-12 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
            {busy ? "Saving…" : "Log meal"}
          </button>
        </>
      ) : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
