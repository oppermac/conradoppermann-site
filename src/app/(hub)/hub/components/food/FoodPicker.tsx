"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";

export type FoodRow = {
  id: string;
  name: string;
  brand: string | null;
  basis: "per100g" | "perUnit";
  unitLabel: string | null;
  unitGrams: number | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  defaultQty: number | null;
  source: string;
};

export type PickedItem = { foodId: string; name: string; portion: string; grams: number | null; kcal: number; proteinG: number; carbsG: number; fatG: number };

/** Mirrors foodToItem on the server so the picker can show live numbers without a round trip. */
export function itemFor(food: FoodRow, qty: number): PickedItem {
  const factor = food.basis === "perUnit" ? qty : qty / 100;
  const grams = food.basis === "perUnit" ? (food.unitGrams ? food.unitGrams * qty : null) : qty;
  const unit = food.unitLabel ?? "unit";
  const portion = food.basis === "perUnit" ? `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${unit}${qty === 1 ? "" : "s"}${grams ? ` · ${Math.round(grams)} g` : ""}` : `${Math.round(qty)} g`;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { foodId: food.id, name: food.brand ? `${food.name} (${food.brand})` : food.name, portion, grams, kcal: Math.round(food.kcal * factor), proteinG: r1(food.proteinG * factor), carbsG: r1(food.carbsG * factor), fatG: r1(food.fatG * factor) };
}

const QUICK: Record<"per100g" | "perUnit", number[]> = { per100g: [50, 100, 150, 200, 250], perUnit: [0.5, 1, 1.5, 2, 3] };

/**
 * Search the food library and add one at a quantity. Tap a food to open its quantity row; the macros update as
 * you type. New foods are added inline with per-100 g or per-unit values.
 */
export function FoodPicker({ onPick, autoFocus = true }: { onPick: (item: PickedItem) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<FoodRow | null>(null);
  const [qty, setQty] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/hub/api/foods?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { foods?: FoodRow[] }) => {
          if (!cancelled) setRows(d.foods ?? []);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const preview = useMemo(() => (open ? itemFor(open, parseFloat(qty.replace(",", ".")) || 0) : null), [open, qty]);

  function choose(f: FoodRow) {
    setOpen(f);
    setQty(String(f.defaultQty ?? (f.basis === "perUnit" ? 1 : 100)));
  }
  function step(delta: number) {
    if (!open) return;
    const cur = parseFloat(qty.replace(",", ".")) || 0;
    const inc = open.basis === "perUnit" ? 0.5 : 25;
    const next = Math.max(open.basis === "perUnit" ? 0.5 : 25, Math.round((cur + delta * inc) * 100) / 100);
    setQty(String(next));
  }
  function confirm() {
    if (!open || !preview || preview.kcal < 0 || !(parseFloat(qty.replace(",", ".")) > 0)) return;
    onPick(preview);
    setOpen(null);
    setQ("");
  }

  const per = (f: FoodRow) => (f.basis === "perUnit" ? `per ${f.unitLabel ?? "unit"}${f.unitGrams ? ` (${Math.round(f.unitGrams)} g)` : ""}` : "per 100 g");

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-11 items-center gap-2 rounded-control border border-hairline bg-card px-3">
        <Search size={16} className="shrink-0 text-ink-3" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods" autoFocus={autoFocus} className="h-full w-full bg-transparent text-[17px] outline-none" aria-label="Search foods" />
      </label>

      {open ? (
        <div className="hub-elevated flex flex-col gap-3 p-3.5">
          <div>
            <div className="text-[15px] font-semibold">{open.name}{open.brand ? <span className="font-normal text-ink-2"> · {open.brand}</span> : null}</div>
            <div className="text-[12.5px] text-ink-3">{per(open)}: {Math.round(open.kcal)} kcal · P {Math.round(open.proteinG)} · C {Math.round(open.carbsG)} · F {Math.round(open.fatG)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => step(-1)} aria-label={open.basis === "perUnit" ? "Half a unit less" : "25 g less"} className="hub-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-ink-2">
              <Minus size={16} aria-hidden />
            </button>
            <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirm()} aria-label="Quantity" className="hub-tabular h-11 w-20 rounded-control border border-hairline bg-card px-2 text-center text-[17px]" autoFocus />
            <button type="button" onClick={() => step(1)} aria-label={open.basis === "perUnit" ? "Half a unit more" : "25 g more"} className="hub-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-ink-2">
              <Plus size={16} aria-hidden />
            </button>
            <span className="text-[15px] text-ink-2">{open.basis === "perUnit" ? `${open.unitLabel ?? "unit"}${parseFloat(qty) === 1 ? "" : "s"}` : "g"}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK[open.basis].map((n) => (
              <button key={n} type="button" onClick={() => setQty(String(n))} className={`hub-press hub-tabular h-8 rounded-full px-3 text-[12px] font-semibold ${String(n) === qty ? "bg-ink text-page" : "border border-hairline text-ink-2"}`}>
                {n}
              </button>
            ))}
          </div>
          {preview ? (
            <div className="hub-tabular text-[13px] text-ink-2">
              {preview.kcal} kcal · P {Math.round(preview.proteinG)} · C {Math.round(preview.carbsG)} · F {Math.round(preview.fatG)}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOpen(null)} className="hub-press h-10 rounded-full border border-hairline text-[14px] font-semibold">Back</button>
            <button type="button" onClick={confirm} className="hub-press h-10 rounded-full bg-ink text-[14px] font-semibold text-page">Add</button>
          </div>
        </div>
      ) : adding ? (
        <NewFoodForm
          initialName={q}
          onCancel={() => setAdding(false)}
          onCreated={(f) => {
            setAdding(false);
            setRows((r) => [f, ...r]);
            choose(f);
          }}
        />
      ) : (
        <ul className="max-h-[40vh] divide-y divide-hairline overflow-y-auto">
          {rows.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => choose(f)} className="hub-press flex w-full items-center justify-between gap-3 py-2.5 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{f.name}{f.brand ? <span className="font-normal text-ink-3"> · {f.brand}</span> : null}</span>
                  <span className="block text-[12.5px] text-ink-3">{per(f)} · {Math.round(f.kcal)} kcal · P {Math.round(f.proteinG)}</span>
                </span>
                <Plus size={16} className="shrink-0 text-ink-3" aria-hidden />
              </button>
            </li>
          ))}
          {!loading && rows.length === 0 ? <li className="py-3 text-[14px] text-ink-3">Nothing in the library matches.</li> : null}
          <li className="pt-2">
            <button type="button" onClick={() => setAdding(true)} className="hub-press flex h-10 items-center gap-1.5 rounded-full border border-hairline px-3.5 text-[14px] font-semibold text-ink-2">
              <Plus size={16} aria-hidden /> New food{q.trim() ? ` “${q.trim()}”` : ""}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Add a food from a label: name, brand, and the numbers per 100 g, or per unit for things sold by the piece. */
function NewFoodForm({ initialName, onCancel, onCreated }: { initialName: string; onCancel: () => void; onCreated: (f: FoodRow) => void }) {
  const [name, setName] = useState(initialName);
  const [brand, setBrand] = useState("");
  const [basis, setBasis] = useState<"per100g" | "perUnit">("per100g");
  const [unitLabel, setUnitLabel] = useState("");
  const [unitGrams, setUnitGrams] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !kcal) return;
    setBusy(true);
    setError(null);
    const body = { name: name.trim(), brand: brand.trim() || null, basis, unitLabel: basis === "perUnit" ? unitLabel.trim() || "unit" : null, unitGrams: basis === "perUnit" && unitGrams ? num(unitGrams) : null, kcal: num(kcal), proteinG: num(p), carbsG: num(c), fatG: num(f), source: "label" };
    const res = await fetch("/hub/api/foods", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { food?: FoodRow; error?: string };
    setBusy(false);
    if (!res.ok || !data.food) {
      setError(data.error ?? "Couldn’t save the food.");
      return;
    }
    onCreated(data.food);
  }

  const field = "h-10 rounded-control border border-hairline bg-card px-2.5 text-[15px]";
  return (
    <div className="hub-elevated flex flex-col gap-2.5 p-3.5">
      <div className="hub-eyebrow">New food</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Food name" className={field} />
      <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand (optional)" aria-label="Brand" className={field} />
      <div className="hub-chrome grid grid-cols-2 rounded-control p-0.5" role="tablist" aria-label="Values are">
        {(["per100g", "perUnit"] as const).map((b) => (
          <button key={b} type="button" role="tab" aria-selected={basis === b} onClick={() => setBasis(b)} className={`h-9 rounded-[10px] text-[13px] font-semibold ${basis === b ? "bg-elevated text-ink shadow-sm" : "text-ink-2"}`}>
            {b === "per100g" ? "Per 100 g" : "Per unit"}
          </button>
        ))}
      </div>
      {basis === "perUnit" ? (
        <div className="grid grid-cols-2 gap-2">
          <input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="Unit, e.g. scoop" aria-label="Unit name" className={field} />
          <input inputMode="decimal" value={unitGrams} onChange={(e) => setUnitGrams(e.target.value)} placeholder="Grams per unit" aria-label="Grams per unit" className={`${field} hub-tabular`} />
        </div>
      ) : null}
      <div className="grid grid-cols-4 gap-2">
        {[["kcal", kcal, setKcal], ["Protein", p, setP], ["Carbs", c, setC], ["Fat", f, setF]].map(([label, val, set]) => (
          <label key={label as string} className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            {label as string}
            <input inputMode="decimal" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} className={`${field} hub-tabular text-right`} />
          </label>
        ))}
      </div>
      {error ? <p className="text-[13px] text-bad">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="hub-press h-10 rounded-full border border-hairline text-[14px] font-semibold">Cancel</button>
        <button type="button" disabled={busy || !name.trim() || !kcal} onClick={save} className="hub-press h-10 rounded-full bg-ink text-[14px] font-semibold text-page disabled:opacity-50">{busy ? "Saving…" : "Save food"}</button>
      </div>
    </div>
  );
}
