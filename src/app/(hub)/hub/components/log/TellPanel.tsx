"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Undo2 } from "lucide-react";

type Action = { name: string; summary: string; isError: boolean; data?: { mealId?: string; activityId?: string; medicationId?: string } };
type Result = { reply: string; actions: Action[] };

const EXAMPLES = ["Last night I had pasta with peppers and bacon", "Pints with Danny and Conor in Kehoe's, 3 Guinness", "Took magnesium and omega-3", "Walked the pier with Mum for an hour"];

/** Free text → Claude logs whatever is in it (meals, drinks, people, supplements, check-ins), with per-item undo. */
export function TellPanel() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [undone, setUndone] = useState<Set<number>>(new Set());

  async function submit() {
    if (text.trim().length < 2) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setUndone(new Set());
    try {
      const res = await fetch("/hub/api/log/tell", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: text.trim() }) });
      const data = (await res.json().catch(() => ({}))) as Result & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn’t log that.");
      setResult({ reply: data.reply, actions: data.actions ?? [] });
      setText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t log that.");
    } finally {
      setBusy(false);
    }
  }

  async function undo(i: number, a: Action) {
    const d = a.data ?? {};
    const url = d.mealId ? `/hub/api/meals/${d.mealId}` : d.activityId ? `/hub/api/activities/${d.activityId}` : d.medicationId ? `/hub/api/medications/${d.medicationId}` : null;
    if (!url) return;
    await fetch(url, { method: "DELETE" });
    setUndone((s) => new Set(s).add(i));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-snug text-ink-2">Say what happened, in your own words. Meals, drinks, who you saw, supplements, how you feel. Claude works out the day and files it.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={4}
        placeholder={EXAMPLES[new Date().getDate() % EXAMPLES.length]}
        className="rounded-control border border-hairline bg-card px-3 py-2 text-[17px]"
        autoFocus
      />
      <button type="button" disabled={busy || text.trim().length < 2} onClick={submit} className="hub-press h-11 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
        {busy ? "Logging…" : "Log it"}
      </button>
      {error ? <p className="rounded-tile bg-bad/10 px-3 py-2 text-[13px] text-bad">{error}</p> : null}
      {result ? (
        <div className="hub-elevated flex flex-col gap-2 p-3.5">
          <p className="text-[15px]">{result.reply}</p>
          {result.actions.length ? (
            <ul className="flex flex-col divide-y divide-hairline">
              {result.actions.map((a, i) => {
                const canUndo = Boolean(a.data?.mealId || a.data?.activityId || a.data?.medicationId) && !a.isError;
                const gone = undone.has(i);
                return (
                  <li key={i} className={`flex items-center justify-between gap-3 py-2 text-[14px] ${gone ? "text-ink-3 line-through" : ""}`}>
                    <span className="flex min-w-0 items-center gap-2">
                      {a.isError ? <CircleAlert size={16} className="shrink-0 text-bad" aria-hidden /> : <Check size={16} className="shrink-0 text-good" aria-hidden />}
                      <span className="truncate">{a.summary}</span>
                    </span>
                    {canUndo && !gone ? (
                      <button type="button" onClick={() => undo(i, a)} className="hub-press flex h-8 shrink-0 items-center gap-1 rounded-full border border-hairline px-2.5 text-[12px] font-semibold text-ink-2">
                        <Undo2 size={13} aria-hidden /> Undo
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
