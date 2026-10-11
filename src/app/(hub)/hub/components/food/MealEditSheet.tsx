"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { MealRow } from "./MealList";

type Slot = "breakfast" | "lunch" | "dinner" | "snack";
const SLOTS: Slot[] = ["breakfast", "lunch", "dinner", "snack"];

type Item = { name: string; portion: string; grams: number | null; kcal: number; proteinG: number; carbsG: number; fatG: number };

const num = (v: string): number => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Edit a logged meal in place: name, slot and every item's macros. Totals follow the items. Rendered inside the Sheet by MealList. */
export function MealEditForm({ meal, onClose, onSaved }: { meal: MealRow; onClose: () => void; onSaved: (name: string) => void }) {
  const [name, setName] = useState(meal.name);
  const [slot, setSlot] = useState<Slot>((SLOTS as string[]).includes(meal.slot) ? (meal.slot as Slot) : "snack");
  const [items, setItems] = useState<Item[]>(
    meal.items.length
      ? meal.items.map((it) => ({ name: it.name, portion: it.portion ?? "", grams: it.grams, kcal: it.kcal, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG }))
      : [{ name: meal.name, portion: "", grams: null, kcal: meal.kcal, proteinG: meal.proteinG, carbsG: meal.carbsG, fatG: meal.fatG }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => items.reduce((a, it) => ({ kcal: a.kcal + it.kcal, proteinG: a.proteinG + it.proteinG, carbsG: a.carbsG + it.carbsG, fatG: a.fatG + it.fatG }), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }),
    [items],
  );

  function update(i: number, patch: Partial<Item>) {
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      name: name.trim() || meal.name,
      slot,
      items: items.filter((it) => it.name.trim()).map((it) => ({ name: it.name.trim(), portion: it.portion.trim() || null, grams: it.grams, kcal: Math.round(it.kcal), proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG })),
      kcal: Math.round(totals.kcal),
      proteinG: totals.proteinG,
      carbsG: totals.carbsG,
      fatG: totals.fatG,
    };
    const res = await fetch(`/hub/api/meals/${meal.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn’t save the changes.");
      return;
    }
    onSaved(body.name);
  }

  const field = "h-10 w-full rounded-control border border-hairline bg-card px-2.5 text-[15px]";
  const macro = `${field} hub-tabular text-right`;

  return (
    <div className="flex flex-col gap-4 pt-1">
        <h2 className="hub-eyebrow">Edit meal</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px] font-semibold" aria-label="Meal name" />
        <div className="hub-chrome grid grid-cols-4 rounded-control p-0.5" role="tablist" aria-label="Meal slot">
          {SLOTS.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={slot === s} onClick={() => setSlot(s)} className={`h-9 rounded-[10px] text-[13px] font-semibold capitalize ${slot === s ? "bg-elevated text-ink shadow-sm" : "text-ink-2"}`}>
              {s}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-3">
          <li className="grid grid-cols-[1fr_52px_44px_44px_44px_32px] items-end gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            <span>Item</span>
            <span className="text-right">kcal</span>
            <span className="text-right">P</span>
            <span className="text-right">C</span>
            <span className="text-right">F</span>
            <span />
          </li>
          {items.map((it, i) => (
            <li key={i} className="grid grid-cols-[1fr_52px_44px_44px_44px_32px] items-center gap-1.5">
              <div className="flex flex-col gap-1">
                <input value={it.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Item" aria-label={`Item ${i + 1} name`} className={field} />
                <input value={it.portion} onChange={(e) => update(i, { portion: e.target.value })} placeholder="Portion, e.g. 200 g" aria-label={`Item ${i + 1} portion`} className={`${field} h-9 text-[13px] text-ink-2`} />
              </div>
              <input inputMode="numeric" value={it.kcal} onChange={(e) => update(i, { kcal: num(e.target.value) })} aria-label={`Item ${i + 1} kcal`} className={macro} />
              <input inputMode="decimal" value={it.proteinG} onChange={(e) => update(i, { proteinG: num(e.target.value) })} aria-label={`Item ${i + 1} protein`} className={macro} />
              <input inputMode="decimal" value={it.carbsG} onChange={(e) => update(i, { carbsG: num(e.target.value) })} aria-label={`Item ${i + 1} carbs`} className={macro} />
              <input inputMode="decimal" value={it.fatG} onChange={(e) => update(i, { fatG: num(e.target.value) })} aria-label={`Item ${i + 1} fat`} className={macro} />
              <button type="button" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} aria-label={`Remove ${it.name || "item"}`} className="hub-press flex h-10 w-8 items-center justify-center rounded-full text-ink-3">
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setItems((xs) => [...xs, { name: "", portion: "", grams: null, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }])} className="hub-press flex h-10 items-center justify-center gap-1.5 self-start rounded-full border border-hairline px-3.5 text-[14px] font-semibold text-ink-2">
          <Plus size={16} aria-hidden /> Add item
        </button>

        <div className="hub-elevated flex items-center justify-between px-4 py-3 text-[15px]">
          <span className="font-semibold">Total</span>
          <span className="hub-tabular text-ink-2">
            {Math.round(totals.kcal)} kcal · P {Math.round(totals.proteinG)} C {Math.round(totals.carbsG)} F {Math.round(totals.fatG)}
          </span>
        </div>
        {error ? <p className="text-[13px] text-bad">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="hub-press h-12 rounded-full border border-hairline text-[15px] font-semibold">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={save} className="hub-press h-12 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
    </div>
  );
}
