"use client";

import { useEffect, useState } from "react";
import { dayKey } from "@/lib/hub/time";

type Status = "loading" | "idle" | "saving" | "saved" | "error";

/** The review's reflection question: PUTs `/hub/api/checkins/{today}` `{ notes }` (today, not the review's week). */
export function ReflectionField({ question }: { question: string }) {
  const [day] = useState(() => dayKey());
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/hub/api/checkins/${day}`)
      .then((r) => r.json())
      .then((data: { checkin?: { notes?: string | null } | null }) => {
        if (!cancelled && data.checkin?.notes) setNotes(data.checkin.notes);
      })
      .catch(() => {
        /* start blank */
      })
      .finally(() => {
        if (!cancelled) setStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch(`/hub/api/checkins/${day}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="hub-card p-5">
      <div className="hub-eyebrow">Reflect</div>
      <p className="mt-1 text-[15px] font-medium leading-snug">{question}</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={status === "loading"}
        placeholder="A sentence or two…"
        rows={3}
        aria-label="Your reflection"
        className="mt-3 w-full resize-none rounded-control border border-hairline bg-elevated px-3 py-2.5 text-[15px] outline-none focus:border-tint disabled:opacity-50"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving" || status === "loading"}
          className="hub-press rounded-full bg-ink px-5 py-2.5 text-[15px] font-semibold text-page disabled:opacity-40"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        <span aria-live="polite">
          {status === "saved" ? <span className="text-[13px] font-medium text-good">Saved</span> : null}
          {status === "error" ? <span className="text-[13px] font-medium text-bad">Something went wrong</span> : null}
        </span>
      </div>
    </section>
  );
}
