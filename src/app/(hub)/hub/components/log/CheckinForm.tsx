"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "../sheet/Toast";

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-ink-2">{label}</div>
      <div className="mt-1.5 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} ${n} of 5`} aria-pressed={value === n} onClick={() => onChange(n)} className={`hub-press h-11 flex-1 rounded-control text-[15px] font-semibold ${value === n ? "bg-ink text-page" : "border border-hairline bg-card"}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckinForm({ weightOnly = false, onDone }: { weightOnly?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [gratitude, setGratitude] = useState("");
  const [notes, setNotes] = useState("");
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(new Date());
    const body = weightOnly
      ? { weightKg: weight ? Number(weight) : null }
      : { energy, mood, gratitude: gratitude || null, notes: notes || null, weightKg: weight ? Number(weight) : undefined };
    const res = await fetch(`/hub/api/checkins/${day}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn’t save that.");
      return;
    }
    setToast({ message: weightOnly ? "Weight saved" : "Check-in saved" });
    router.refresh();
    onDone?.();
  }

  return (
    <div className="flex flex-col gap-4">
      {!weightOnly ? (
        <>
          <Scale label="Energy" value={energy} onChange={setEnergy} />
          <Scale label="Mood" value={mood} onChange={setMood} />
          <input value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="One thing you’re grateful for" className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px]" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="rounded-control border border-hairline bg-card px-3 py-2 text-[15px]" />
        </>
      ) : null}
      <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
        Weight (kg)
        <input type="number" inputMode="decimal" step="0.1" min={30} max={250} value={weight} onChange={(e) => setWeight(e.target.value)} className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px] font-normal text-ink" />
      </label>
      {error ? <p className="text-[13px] text-bad">{error}</p> : null}
      <button type="button" disabled={busy || (weightOnly && !weight)} onClick={save} className="hub-press h-11 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
        {busy ? "Saving…" : "Save"}
      </button>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
