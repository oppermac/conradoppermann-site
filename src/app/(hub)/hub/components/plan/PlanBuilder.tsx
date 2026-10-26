"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, Minus, Pencil, Plus, Printer, Trash2, X } from "lucide-react";
import type { PlanData, PlanDay, PlanEntry, SetMeal, Macro } from "@/lib/hub/meals/plan-store";
import type { PlanItem } from "@/lib/hub/db/schema";
import { Sheet } from "../sheet/Sheet";
import { Toast, type ToastState } from "../sheet/Toast";
import { FoodPicker, type PickedItem } from "../food/FoodPicker";

type Slot = "breakfast" | "lunch" | "snack" | "dinner";
const SLOTS: Slot[] = ["breakfast", "lunch", "snack", "dinner"];
const SLOT_LABEL: Record<Slot, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };
const r = (n: number) => Math.round(n).toLocaleString("en-GB");
const sum = (items: PlanItem[]): Macro => items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, proteinG: a.proteinG + i.proteinG, carbsG: a.carbsG + i.carbsG, fatG: a.fatG + i.fatG }), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
const toPlanItem = (p: PickedItem): PlanItem => ({ foodId: p.foodId || null, name: p.name, portion: p.portion, grams: p.grams, kcal: p.kcal, proteinG: p.proteinG, carbsG: p.carbsG, fatG: p.fatG, qty: p.qty, basis: p.basis, unitLabel: p.unitLabel, unitGrams: p.unitGrams, base: p.base });
const shortName = (n: string) => n.replace(/\s*\(.*\)$/, "");

/** Re-size a row that knows its basis: macros scale from `base`, portion text and grams follow. */
function resized(it: PlanItem, qty: number): PlanItem {
  if (!it.base || !it.basis) return it;
  const factor = it.basis === "perUnit" ? qty : qty / 100;
  const grams = it.basis === "perUnit" ? (it.unitGrams ? it.unitGrams * qty : null) : qty;
  const unit = it.unitLabel ?? "unit";
  const portion = it.basis === "perUnit" ? `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${unit}${qty === 1 ? "" : "s"}${grams ? ` · ${Math.round(grams)} g` : ""}` : `${Math.round(qty)} g`;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { ...it, qty, grams, portion, kcal: Math.round(it.base.kcal * factor), proteinG: r1(it.base.proteinG * factor), carbsG: r1(it.base.carbsG * factor), fatG: r1(it.base.fatG * factor) };
}

function MacroLine({ m, dim }: { m: Macro; dim?: boolean }) {
  return (
    <span className={`hub-tabular whitespace-nowrap text-[12.5px] ${dim ? "text-ink-3" : "text-ink-2"}`}>
      {r(m.kcal)} kcal · P {r(m.proteinG)} · C {r(m.carbsG)} · F {r(m.fatG)}
    </span>
  );
}

function Delta({ total, target }: { total: Macro; target: PlanDay["targets"] }) {
  const d = (a: number, b: number | null) => (b == null ? "" : `${Math.round(a - b) >= 0 ? "+" : ""}${Math.round(a - b)}`);
  const cls = (a: number, b: number | null, tol: number) => (b == null ? "text-ink-3" : Math.abs(a - b) <= tol ? "text-good" : a > b ? "text-warn" : "text-ink-3");
  return (
    <span className="hub-tabular whitespace-nowrap text-[12px]">
      <span className={cls(total.kcal, target.kcal, 150)}>{d(total.kcal, target.kcal)} kcal</span> · <span className={cls(total.proteinG, target.proteinG, 15)}>P {d(total.proteinG, target.proteinG)}</span> · <span className={cls(total.carbsG, target.carbsG, 30)}>C {d(total.carbsG, target.carbsG)}</span> · <span className={cls(total.fatG, target.fatG, 8)}>F {d(total.fatG, target.fatG)}</span>
    </span>
  );
}

/** Items picked from the library, with running totals, used for ad-hoc entries and set meals. */
function ItemComposer({ items, onChange }: { items: PlanItem[]; onChange: (items: PlanItem[]) => void }) {
  const [picking, setPicking] = useState(items.length === 0);
  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? (
        <ul className="divide-y divide-hairline">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{it.name}</div>
                <div className="hub-tabular text-[12.5px] text-ink-3">{it.portion ?? ""} · {r(it.kcal)} kcal · P {r(it.proteinG)} C {r(it.carbsG)} F {r(it.fatG)}</div>
              </div>
              {it.base && it.basis && it.qty != null ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => onChange(items.map((x, j) => (j === i ? resized(x, Math.max(it.basis === "perUnit" ? 0.5 : 25, (it.qty ?? 0) - (it.basis === "perUnit" ? 0.5 : 25))) : x)))} aria-label={`Less ${it.name}`} className="hub-press flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-ink-2">
                    <Minus size={14} aria-hidden />
                  </button>
                  <span className="hub-tabular w-9 text-center text-[13px] font-semibold">{it.basis === "perUnit" ? it.qty : Math.round(it.qty)}</span>
                  <button type="button" onClick={() => onChange(items.map((x, j) => (j === i ? resized(x, (it.qty ?? 0) + (it.basis === "perUnit" ? 0.5 : 25)) : x)))} aria-label={`More ${it.name}`} className="hub-press flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-ink-2">
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
              ) : null}
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${it.name}`} className="hub-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-3">
                <Trash2 size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {picking ? (
        <FoodPicker
          autoFocus={items.length === 0}
          onPick={(p) => {
            onChange([...items, toPlanItem(p)]);
            setPicking(false);
          }}
        />
      ) : (
        <button type="button" onClick={() => setPicking(true)} className="hub-press flex h-10 items-center justify-center gap-1.5 self-start rounded-full border border-hairline px-3.5 text-[14px] font-semibold text-ink-2">
          <Plus size={16} aria-hidden /> Add food
        </button>
      )}
      {items.length > 0 ? (
        <div className="hub-elevated flex items-center justify-between px-4 py-3 text-[15px]">
          <span className="font-semibold">Total</span>
          <MacroLine m={sum(items)} />
        </div>
      ) : null}
    </div>
  );
}

type AddTarget = { weekday: number; slot: Slot } | null;
type EditMeal = { id: string | null; entryId?: string | null; name: string; slot: Slot; items: PlanItem[] } | null;

export function PlanBuilder({ initial }: { initial: PlanData }) {
  const [data, setData] = useState<PlanData>(initial);
  const [add, setAdd] = useState<AddTarget>(null);
  const [tab, setTab] = useState<"set" | "foods">("set");
  const [draft, setDraft] = useState<PlanItem[]>([]);
  const [draftName, setDraftName] = useState("");
  const [saveAsSet, setSaveAsSet] = useState(true);
  const [edit, setEdit] = useState<EditMeal>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/hub/api/plan");
    if (res.ok) setData((await res.json()) as PlanData);
  }, []);
  const closeAdd = useCallback(() => setAdd(null), []);
  const closeEdit = useCallback(() => setEdit(null), []);

  async function post(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(d.error ?? "Something went wrong");
    }
    return res.json();
  }

  async function placeSetMeal(sm: SetMeal) {
    if (!add) return;
    setBusy(true);
    try {
      await post("/hub/api/plan", "POST", { weekday: add.weekday, slot: add.slot, planMealId: sm.id });
      await refresh();
      setAdd(null);
      setToast({ message: `${sm.name} added` });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Couldn’t add" });
    } finally {
      setBusy(false);
    }
  }

  async function placeDraft() {
    if (!add || !draft.length) return;
    setBusy(true);
    const name = draftName.trim() || draft.map((i) => i.name.replace(/\s*\(.*\)$/, "")).slice(0, 3).join(", ");
    try {
      if (saveAsSet) {
        const { setMeal } = (await post("/hub/api/plan/meals", "POST", { name, slot: add.slot, items: draft })) as { setMeal: SetMeal };
        await post("/hub/api/plan", "POST", { weekday: add.weekday, slot: add.slot, planMealId: setMeal.id });
      } else {
        await post("/hub/api/plan", "POST", { weekday: add.weekday, slot: add.slot, name, items: draft });
      }
      await refresh();
      setAdd(null);
      setDraft([]);
      setDraftName("");
      setToast({ message: `${name} added` });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Couldn’t add" });
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(e: PlanEntry) {
    await post(`/hub/api/plan/entries/${e.id}`, "DELETE").catch(() => {});
    await refresh();
  }

  async function saveSetMeal() {
    if (!edit || !edit.items.length) return;
    setBusy(true);
    const body = { name: edit.name.trim() || "Set meal", slot: edit.slot, items: edit.items };
    try {
      if (edit.entryId) await post(`/hub/api/plan/entries/${edit.entryId}`, "PATCH", { name: body.name, items: body.items });
      else if (edit.id) await post(`/hub/api/plan/meals/${edit.id}`, "PATCH", body);
      else await post("/hub/api/plan/meals", "POST", body);
      await refresh();
      setEdit(null);
      setToast({ message: `${body.name} saved` });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Couldn’t save" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteSetMeal(sm: SetMeal) {
    const uses = data.days.reduce((n, d) => n + d.entries.filter((e) => e.planMealId === sm.id).length, 0);
    if (uses > 0 && !window.confirm(`${sm.name} is used ${uses} time${uses === 1 ? "" : "s"} in the week. Delete it everywhere?`)) return;
    await post(`/hub/api/plan/meals/${sm.id}`, "DELETE").catch(() => {});
    await refresh();
  }

  async function copyDay(from: number, to: number) {
    if (from === to) return;
    await post("/hub/api/plan", "POST", { action: "copyDay", from, to }).catch(() => {});
    await refresh();
    setToast({ message: `Copied ${data.days[from - 1].label} to ${data.days[to - 1].label}` });
  }

  const training = data.days.find((d) => d.kind === "training")?.targets;
  const rest = data.days.find((d) => d.kind === "rest")?.targets;
  const planned = data.days.filter((d) => d.entries.length > 0);
  const onTarget = planned.filter((d) => d.targets.kcal != null && Math.abs(d.totals.kcal - d.targets.kcal) <= 150 && (d.targets.proteinG == null || d.totals.proteinG >= d.targets.proteinG - 15));
  const weekLine = planned.length === 0 ? "Nothing planned yet. Add a meal to any day to start." : `${planned.length} of 7 days planned · ${onTarget.length} within range${planned.length < 7 ? "" : " · week complete"}`;
  const setMealsForSlot = useMemo(() => (add ? [...data.setMeals.filter((m) => m.slot === add.slot), ...data.setMeals.filter((m) => m.slot !== add.slot)] : data.setMeals), [data.setMeals, add]);

  return (
    <div className="flex flex-col gap-5">
      <section className="hub-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {[["Training day · Tue, Thu, Sat", training], ["Rest day · Mon, Wed, Fri, Sun", rest]].map(([label, t]) =>
            t && typeof t !== "string" ? (
              <div key={label as string}>
                <div className="hub-eyebrow">{label as string}</div>
                <div className="hub-tabular mt-0.5 text-[15px]">
                  <span className="font-semibold">{r(t.kcal ?? 0)}</span> kcal · <span className="font-semibold">{t.proteinG}</span> P · <span className="font-semibold">{t.carbsG}</span> C · <span className="font-semibold">{t.fatG}</span> F
                </div>
              </div>
            ) : null,
          )}
        </div>
        <button type="button" onClick={() => window.print()} className="hub-press print:hidden flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 text-[13px] font-semibold text-ink-2">
          <Printer size={16} aria-hidden /> Print
        </button>
        <p className="w-full text-[13.5px] text-ink-2">{weekLine}</p>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {data.days.map((day) => (
          <section key={day.weekday} className="hub-card plan-day p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-bold tracking-tight">{day.label}</h2>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${day.kind === "training" ? "bg-tint/12 text-tint" : "bg-ink/6 text-ink-2"}`}>{day.kind === "training" ? "Training" : "Rest"}</span>
                <label className="print:hidden relative flex h-8 w-8 items-center justify-center rounded-full text-ink-3" title="Copy this day to…">
                  <Copy size={15} aria-hidden />
                  <select aria-label={`Copy ${day.label} to`} value="" onChange={(e) => e.target.value && copyDay(day.weekday, Number(e.target.value))} className="absolute inset-0 cursor-pointer opacity-0">
                    <option value="">Copy to…</option>
                    {data.days.filter((d) => d.weekday !== day.weekday).map((d) => (
                      <option key={d.weekday} value={d.weekday}>{d.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {SLOTS.map((slot) => {
                const entries = day.entries.filter((e) => e.slot === slot);
                return (
                  <div key={slot}>
                    <div className="flex items-center justify-between">
                      <div className="hub-eyebrow">{SLOT_LABEL[slot]}</div>
                      <button type="button" onClick={() => { setAdd({ weekday: day.weekday, slot }); setTab("set"); setDraft([]); setDraftName(""); }} aria-label={`Add to ${day.label} ${slot}`} className="hub-press print:hidden flex h-7 w-7 items-center justify-center rounded-full border border-hairline text-ink-3">
                        <Plus size={14} aria-hidden />
                      </button>
                    </div>
                    {entries.length === 0 ? (
                      <div className="py-1 text-[13px] text-ink-3">Nothing planned</div>
                    ) : (
                      <ul className="divide-y divide-hairline">
                        {entries.map((e) => (
                          <li key={e.id} className="py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[14.5px] font-semibold leading-snug">
                                  {e.name}
                                  {!e.planMealId ? <span className="ml-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">custom</span> : null}
                                </div>
                                <MacroLine m={e.totals} />
                              </div>
                              <div className="print:hidden flex shrink-0 items-center">
                                <button type="button" onClick={() => setEdit({ id: e.planMealId, entryId: e.id, name: e.name, slot: e.slot, items: e.items })} aria-label={`Edit ${e.name} for ${day.label}`} className="hub-press flex h-8 w-8 items-center justify-center rounded-full text-ink-3">
                                  <Pencil size={14} aria-hidden />
                                </button>
                                <button type="button" onClick={() => removeEntry(e)} aria-label={`Remove ${e.name}`} className="hub-press flex h-8 w-8 items-center justify-center rounded-full text-ink-3">
                                  <X size={15} aria-hidden />
                                </button>
                              </div>
                            </div>
                            <ul className="mt-1 flex flex-col gap-0.5">
                              {e.items.map((i, k) => (
                                <li key={k} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                                  <span className="min-w-0 truncate text-ink-2">{shortName(i.name)}{i.portion ? <span className="text-ink-3"> · {i.portion}</span> : null}</span>
                                  <span className="hub-tabular shrink-0 text-ink-3">{r(i.kcal)} · {r(i.proteinG)} · {r(i.carbsG)} · {r(i.fatG)}</span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 border-t-2 border-ink/20 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold">Day</span>
                <MacroLine m={day.totals} />
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-[12px] text-ink-3">vs target</span>
                <Delta total={day.totals} target={day.targets} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="hub-card print:hidden p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold tracking-tight">Set meals</h2>
          <button type="button" onClick={() => setEdit({ id: null, name: "", slot: "dinner", items: [] })} className="hub-press flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-page">
            <Plus size={15} aria-hidden /> New
          </button>
        </div>
        <ul className="mt-3 divide-y divide-hairline">
          {data.setMeals.map((sm) => (
            <li key={sm.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{sm.name} <span className="text-[12px] font-normal uppercase tracking-[0.06em] text-ink-3">{SLOT_LABEL[sm.slot]}</span></div>
                <div className="truncate text-[12px] text-ink-3">{sm.items.map((i) => `${shortName(i.name)}${i.portion ? ` ${i.portion}` : ""}`).join(" · ")}</div>
                <MacroLine m={sm.totals} />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => setEdit({ id: sm.id, name: sm.name, slot: sm.slot, items: sm.items })} aria-label={`Edit ${sm.name}`} className="hub-press flex h-9 w-9 items-center justify-center rounded-full text-ink-2">
                  <Pencil size={16} aria-hidden />
                </button>
                <button type="button" onClick={() => deleteSetMeal(sm)} aria-label={`Delete ${sm.name}`} className="hub-press flex h-9 w-9 items-center justify-center rounded-full text-ink-3">
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            </li>
          ))}
          {data.setMeals.length === 0 ? <li className="py-3 text-[14px] text-ink-3">No set meals yet. Build one from the library.</li> : null}
        </ul>
      </section>

      <section className="hub-card plan-shopping p-5">
        <h2 className="text-[20px] font-bold tracking-tight">Shopping list</h2>
        <p className="mt-1 text-[13px] text-ink-3">Everything in the week, added up.</p>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2 lg:grid-cols-3">
          {data.shopping.map((l) => (
            <li key={l.key} className="flex items-baseline justify-between gap-3 border-b border-hairline pb-1">
              <span className="min-w-0 truncate">{l.name}</span>
              <span className="hub-tabular shrink-0 text-ink-2">{l.qty}</span>
            </li>
          ))}
        </ul>
      </section>

      <Sheet open={add !== null} onClose={closeAdd} label="Add to the plan">
        {add ? (
          <div className="flex flex-col gap-4 pt-1">
            <h2 className="text-[20px] font-semibold">{data.days[add.weekday - 1].label} · {SLOT_LABEL[add.slot]}</h2>
            <div className="hub-chrome grid grid-cols-2 rounded-control p-0.5" role="tablist">
              {(["set", "foods"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-9 rounded-[10px] text-[13px] font-semibold ${tab === t ? "bg-elevated text-ink shadow-sm" : "text-ink-2"}`}>
                  {t === "set" ? "Set meals" : "From foods"}
                </button>
              ))}
            </div>
            {tab === "set" ? (
              <ul className="divide-y divide-hairline">
                {setMealsForSlot.map((sm) => (
                  <li key={sm.id}>
                    <button type="button" disabled={busy} onClick={() => placeSetMeal(sm)} className="hub-press flex w-full items-center justify-between gap-3 py-2.5 text-left disabled:opacity-50">
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold">{sm.name}</span>
                        <MacroLine m={sm.totals} dim />
                      </span>
                      <Plus size={16} className="shrink-0 text-ink-3" aria-hidden />
                    </button>
                  </li>
                ))}
                {setMealsForSlot.length === 0 ? <li className="py-3 text-[14px] text-ink-3">No set meals yet.</li> : null}
              </ul>
            ) : (
              <>
                <ItemComposer items={draft} onChange={setDraft} />
                {draft.length > 0 ? (
                  <>
                    <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Name this meal" aria-label="Meal name" className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px] font-semibold" />
                    <label className="flex items-center gap-2 text-[14px] text-ink-2">
                      <input type="checkbox" checked={saveAsSet} onChange={(e) => setSaveAsSet(e.target.checked)} className="h-4 w-4" /> Save as a set meal for reuse
                    </label>
                    <button type="button" disabled={busy} onClick={placeDraft} className="hub-press h-12 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
                      {busy ? "Adding…" : "Add to the day"}
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </Sheet>

      <Sheet open={edit !== null} onClose={closeEdit} label="Set meal">
        {edit ? (
          <div className="flex flex-col gap-4 pt-1">
            <h2 className="text-[20px] font-semibold">{edit.entryId ? `${edit.name} · this day only` : edit.id ? "Edit set meal" : "New set meal"}</h2>
            {edit.entryId ? <p className="-mt-2 text-[13px] text-ink-3">Changes here apply to this day. The set meal itself stays as it is.</p> : null}
            <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Name" aria-label="Set meal name" className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px] font-semibold" />
            {!edit.entryId ? (
              <div className="hub-chrome grid grid-cols-4 rounded-control p-0.5" role="tablist" aria-label="Slot">
                {SLOTS.map((s) => (
                  <button key={s} type="button" role="tab" aria-selected={edit.slot === s} onClick={() => setEdit({ ...edit, slot: s })} className={`h-9 rounded-[10px] text-[13px] font-semibold ${edit.slot === s ? "bg-elevated text-ink shadow-sm" : "text-ink-2"}`}>
                    {SLOT_LABEL[s]}
                  </button>
                ))}
              </div>
            ) : null}
            <ItemComposer items={edit.items} onChange={(items) => setEdit({ ...edit, items })} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={closeEdit} className="hub-press h-12 rounded-full border border-hairline text-[15px] font-semibold">Cancel</button>
              <button type="button" disabled={busy || !edit.items.length} onClick={saveSetMeal} className="hub-press h-12 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        ) : null}
      </Sheet>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
