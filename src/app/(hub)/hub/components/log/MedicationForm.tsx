"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "../sheet/Toast";

export function MedicationForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [recent, setRecent] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/hub/api/medications?days=60")
      .then((r) => r.json())
      .then((d: { entries?: Array<{ name: string }> }) => {
        if (cancelled) return;
        setRecent(Array.from(new Set((d.entries ?? []).map((e) => e.name))).slice(0, 6));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/hub/api/medications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim(), dose: dose || null }) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; entry?: { id: string; name: string } };
    setBusy(false);
    if (!res.ok || !data.entry) {
      setError(data.error ?? "Couldn’t save that.");
      return;
    }
    const id = data.entry.id;
    setToast({ message: `Noted ${data.entry.name}`, undo: async () => fetch(`/hub/api/medications/${id}`, { method: "DELETE" }).then(() => router.refresh()) });
    setName("");
    setDose("");
    router.refresh();
    onDone?.();
  }

  return (
    <div className="flex flex-col gap-3">
      {recent.length ? (
        <div className="flex flex-wrap gap-2">
          {recent.map((n) => (
            <button key={n} type="button" onClick={() => setName(n)} className="hub-press min-h-9 rounded-full border border-hairline bg-card px-3 text-[14px] font-medium">
              {n}
            </button>
          ))}
        </div>
      ) : null}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What you took" className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px]" />
      <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose (optional)" className="h-11 rounded-control border border-hairline bg-card px-3 text-[15px]" />
      {error ? <p className="text-[13px] text-bad">{error}</p> : null}
      <button type="button" disabled={busy || !name.trim()} onClick={save} className="hub-press h-11 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
        {busy ? "Saving…" : "Taken"}
      </button>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
