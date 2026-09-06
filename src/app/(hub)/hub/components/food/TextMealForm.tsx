"use client";

import { useState } from "react";
import type { MealEstimate } from "@/lib/hub/meals/schema";

export function TextMealForm({ onEstimate, onError }: { onEstimate: (estimate: MealEstimate, photoUrl: null, model: string) => void; onError: (message: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (text.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await fetch("/hub/api/meals/text", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: text.trim() }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; estimate?: MealEstimate; model?: string };
      if (!res.ok || !data.estimate) throw new Error(data.error ?? "Couldn’t understand that meal.");
      onEstimate(data.estimate, null, data.model ?? "");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn’t understand that meal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="2 eggs, sourdough, half an avocado, flat white" className="rounded-control border border-hairline bg-card px-3 py-2 text-[17px]" autoFocus />
      <button type="button" disabled={busy || text.trim().length < 2} onClick={submit} className="hub-press h-11 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
        {busy ? "Analysing…" : "Estimate"}
      </button>
    </div>
  );
}
