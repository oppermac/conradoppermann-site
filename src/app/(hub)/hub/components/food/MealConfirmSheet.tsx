"use client";

import { useEffect, useMemo, useState } from "react";
import type { MealEstimate } from "@/lib/hub/meals/schema";

type Slot = "breakfast" | "lunch" | "dinner" | "snack";
const SLOTS: Slot[] = ["breakfast", "lunch", "dinner", "snack"];

function conf(c: number): { label: string; cls: string } {
  if (c >= 0.75) return { label: "High", cls: "text-good" };
  if (c >= 0.45) return { label: "Medium", cls: "text-warn" };
  return { label: "Low", cls: "text-bad" };
}

const QUALITY_COPY: Record<string, string> = {
  too_dark: "Too dark to see the plate — try again with more light.",
  blurry: "The photo is blurry — a steadier shot will estimate better.",
  partial_view: "Only part of the plate is visible — the estimate assumes the rest.",
  not_food: "That doesn’t look like a meal — want to log it as an activity instead?",
};

/** Editable estimate → confirmed meal. Grams steppers scale each item's macros proportionally. */
export function MealConfirmSheet({
  estimate,
  photoUrl,
  model,
  onSaved,
  onCancel,
  onReanalyse,
}: {
  estimate: MealEstimate;
  photoUrl: string | null;
  model: string;
  onSaved: (saved: { id: string; day: string; name: string }) => void;
  onCancel: () => void;
  onReanalyse?: (hint: string) => Promise<void>;
}) {
  const [name, setName] = useState(estimate.name);
  const [slot, setSlot] = useState<Slot>(estimate.slot ?? "snack");
  const [factors, setFactors] = useState<number[]>(estimate.items.map(() => 1));
  const [global, setGlobal] = useState(1);
  const [answered, setAnswered] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/hub/api/meals")
      .then((r) => r.json())
      .then((d: { totals?: { kcal: number }; targets?: { kcal: number | null } }) => {
        if (cancelled || !d.targets?.kcal) return;
        setLeft(d.targets.kcal - (d.totals?.kcal ?? 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // A new estimate (re-analysis after a question) resets the editable state — adjusted during render, not in an effect.
  const [seenEstimate, setSeenEstimate] = useState(estimate);
  if (seenEstimate !== estimate) {
    setSeenEstimate(estimate);
    setFactors(estimate.items.map(() => 1));
    setName(estimate.name);
    if (estimate.slot) setSlot(estimate.slot);
  }

  const items = useMemo(
    () =>
      estimate.items.map((it, i) => {
        const f = factors[i] * global;
        return { ...it, grams: it.grams !== null ? Math.round(it.grams * f) : null, kcal: Math.round(it.kcal * f), protein_g: it.protein_g * f, carbs_g: it.carbs_g * f, fat_g: it.fat_g * f };
      }),
    [estimate.items, factors, global],
  );
  const totals = useMemo(
    () => ({
      kcal: items.reduce((a, b) => a + b.kcal, 0),
      protein_g: items.reduce((a, b) => a + b.protein_g, 0),
      carbs_g: items.reduce((a, b) => a + b.carbs_g, 0),
      fat_g: items.reduce((a, b) => a + b.fat_g, 0),
      fibre_g: estimate.totals.fibre_g !== null ? estimate.totals.fibre_g * global : null,
    }),
    [items, estimate.totals.fibre_g, global],
  );
  const overall = conf(estimate.confidence);

  function step(i: number, delta: number) {
    const base = estimate.items[i];
    if (base.grams === null || base.grams <= 0) return;
    setFactors((fs) => fs.map((f, j) => (j === i ? Math.max(0.1, (base.grams! * f + delta) / base.grams!) : f)));
  }

  async function save(draft = false) {
    setBusy(true);
    setError(null);
    const body = {
      name: name.trim() || estimate.name,
      slot,
      photoUrl,
      source: photoUrl ? "photo" : "text",
      items: items.map((it) => ({ name: it.name, portion: it.portion, grams: it.grams, kcal: it.kcal, proteinG: it.protein_g, carbsG: it.carbs_g, fatG: it.fat_g })),
      kcal: totals.kcal,
      proteinG: totals.protein_g,
      carbsG: totals.carbs_g,
      fatG: totals.fat_g,
      fibreG: totals.fibre_g,
      confidence: estimate.confidence,
      aiModel: model || null,
      aiRaw: estimate,
      notes: draft ? "draft" : answered ? `Answered: ${answered}` : null,
    };
    const res = await fetch("/hub/api/meals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string; day?: string };
    setBusy(false);
    if (!res.ok || !data.id || !data.day) {
      setError(data.error ?? "Couldn’t save that meal.");
      return;
    }
    onSaved({ id: data.id, day: data.day, name: body.name });
  }

  return (
    <div className="flex flex-col gap-4">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="aspect-[4/3] w-full rounded-tile object-cover" />
      ) : null}
      {estimate.quality_issue ? <p className="rounded-tile bg-warn-fill/10 px-3 py-2 text-[13px] text-warn">{QUALITY_COPY[estimate.quality_issue]}</p> : null}
      <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px] font-semibold" aria-label="Meal name" />
      <div className="hub-chrome grid grid-cols-4 rounded-control p-0.5" role="tablist" aria-label="Meal slot">
        {SLOTS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={slot === s} onClick={() => setSlot(s)} className={`h-9 rounded-[10px] text-[13px] font-semibold capitalize ${slot === s ? "bg-elevated text-ink shadow-sm" : "text-ink-2"}`}>
            {s}
          </button>
        ))}
      </div>
      {estimate.question && !answered ? (
        <div>
          <div className="text-[13px] font-semibold text-ink-2">{estimate.question.text}</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {estimate.question.options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={async () => {
                  setAnswered(o);
                  if (onReanalyse && photoUrl) {
                    setBusy(true);
                    await onReanalyse(`${estimate.question?.text} ${o}`);
                    setBusy(false);
                  }
                }}
                className="hub-press min-h-9 rounded-full border border-hairline bg-card px-3 text-[14px] font-medium"
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <ul className="divide-y divide-hairline rounded-tile border border-hairline">
        {items.map((it, i) => (
          <li key={i} className="px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium">{it.name}</div>
                <div className="text-[12px] text-ink-3">
                  {it.portion}
                  {it.grams !== null ? ` · ${it.grams} g` : ""} · <span className={conf(it.confidence).cls}>{conf(it.confidence).label}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hub-tabular text-[15px] font-semibold">{it.kcal}</span>
                <span className="text-[12px] text-ink-3">kcal</span>
              </div>
            </div>
            {estimate.items[i].grams !== null ? (
              <div className="mt-1.5 flex items-center gap-2">
                <button type="button" aria-label={`Less ${it.name}`} onClick={() => step(i, -10)} className="hub-press h-9 w-9 rounded-full border border-hairline text-[17px]">
                  −
                </button>
                <span className="hub-tabular w-14 text-center text-[13px] text-ink-2">{it.grams} g</span>
                <button type="button" aria-label={`More ${it.name}`} onClick={() => step(i, 10)} className="hub-press h-9 w-9 rounded-full border border-hairline text-[17px]">
                  +
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        {[
          ["Smaller", 0.75],
          ["As shown", 1],
          ["Larger", 1.3],
        ].map(([label, f]) => (
          <button key={String(label)} type="button" aria-pressed={global === f} onClick={() => setGlobal(Number(f))} className={`hub-press h-10 flex-1 rounded-full text-[13px] font-semibold ${global === f ? "bg-ink text-page" : "border border-hairline bg-card"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="hub-elevated flex items-center justify-between px-4 py-3">
        <div>
          <div className="hub-tabular text-[22px] font-semibold leading-none">{totals.kcal} kcal</div>
          <div className="mt-1 text-[12px] text-ink-2">
            P {Math.round(totals.protein_g)} · C {Math.round(totals.carbs_g)} · F {Math.round(totals.fat_g)} g · <span className={overall.cls}>{overall.label} confidence</span>
          </div>
        </div>
        {left !== null ? <div className="hub-tabular text-[13px] font-semibold text-ink-2">{Math.max(0, left - totals.kcal).toLocaleString("en-GB")} left today</div> : null}
      </div>
      {error ? <p className="text-[13px] text-bad">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="hub-press h-11 flex-1 rounded-full border border-hairline text-[15px] font-semibold">
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={() => save(false)} className="hub-press h-11 flex-[2] rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
          {busy ? "Saving…" : "Confirm"}
        </button>
      </div>
      <button type="button" disabled={busy} onClick={() => save(true)} className="hub-press text-center text-[13px] font-semibold text-ink-2">
        Save as draft
      </button>
    </div>
  );
}
