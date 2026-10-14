"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MealAdvice } from "@/lib/hub/coach/meal-advice";
import { Toast, type ToastState } from "../sheet/Toast";

type Result = { advice: MealAdvice; remaining: { kcal: number; proteinG: number; carbsG: number; fatG: number }; trainingDay: boolean };

const r = (n: number) => Math.round(n).toLocaleString("en-GB");

/** What's in the fridge → one meal sized to what's left of today, with a one-tap log once eaten. */
export function EatPanel() {
  const router = useRouter();
  const [have, setHave] = useState("");
  const [busy, setBusy] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function ask() {
    if (have.trim().length < 2) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/hub/api/log/eat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ have: have.trim() }) });
      const data = (await res.json().catch(() => ({}))) as Result & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn’t come up with a meal.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t come up with a meal.");
    } finally {
      setBusy(false);
    }
  }

  async function logIt() {
    if (!result) return;
    setLogging(true);
    try {
      const res = await fetch("/hub/api/log/tell", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: `I just ate: ${result.advice.log_text}` }) });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn’t log it.");
      setToast({ message: data.reply ?? "Logged" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t log it.");
    } finally {
      setLogging(false);
    }
  }

  const a = result?.advice;
  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={have}
        onChange={(e) => setHave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
        }}
        rows={3}
        placeholder="What have you got? Chicken breasts, peppers, waffle fries…"
        className="rounded-control border border-hairline bg-card px-3 py-2 text-[17px]"
        autoFocus
      />
      <button type="button" disabled={busy || have.trim().length < 2} onClick={ask} className="hub-press h-11 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
        {busy ? "Thinking…" : "Suggest a meal"}
      </button>
      {error ? <p className="rounded-tile bg-bad/10 px-3 py-2 text-[13px] text-bad">{error}</p> : null}

      {result && a ? (
        <div className="hub-elevated flex flex-col gap-3 p-4">
          <div>
            <div className="hub-eyebrow">{result.trainingDay ? "Training day" : "Rest day"} · left today {r(result.remaining.kcal)} kcal · {r(result.remaining.proteinG)} P · {r(result.remaining.carbsG)} C · {r(result.remaining.fatG)} F</div>
            <h3 className="mt-1 text-[17px] font-semibold leading-snug">{a.headline}</h3>
          </div>
          <table className="w-full border-collapse text-[14px]">
            <tbody>
              {a.items.map((it, i) => (
                <tr key={i} className="border-t border-hairline">
                  <td className="py-1.5 pr-2">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-[12.5px] text-ink-3">{it.portion}</div>
                  </td>
                  <td className="hub-tabular py-1.5 pl-2 text-right text-ink-2 whitespace-nowrap">{r(it.kcal)} kcal</td>
                  <td className="hub-tabular py-1.5 pl-2 text-right text-ink-2 whitespace-nowrap">{r(it.protein_g)} P</td>
                  <td className="hub-tabular py-1.5 pl-2 text-right text-ink-2 whitespace-nowrap">{r(it.fat_g)} F</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink/20">
                <td className="pt-1.5 font-semibold">Meal</td>
                <td className="hub-tabular pt-1.5 pl-2 text-right font-semibold whitespace-nowrap">{r(a.totals.kcal)} kcal</td>
                <td className="hub-tabular pt-1.5 pl-2 text-right font-semibold whitespace-nowrap">{r(a.totals.protein_g)} P</td>
                <td className="hub-tabular pt-1.5 pl-2 text-right font-semibold whitespace-nowrap">{r(a.totals.fat_g)} F</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[14px] leading-snug text-ink-2">{a.why}</p>
          {a.also ? <p className="text-[13px] leading-snug text-ink-3">{a.also}</p> : null}
          <button type="button" disabled={logging} onClick={logIt} className="hub-press h-11 rounded-full bg-tint text-[15px] font-semibold text-white disabled:opacity-60">
            {logging ? "Logging…" : "Log it once eaten"}
          </button>
        </div>
      ) : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
