"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { CUP_META, type Cup } from "@/lib/hub/domain/activity-types";
import type { SlotKind } from "@/lib/hub/domain/slots";

export type GapSlot = { start: string; end: string; dayKey: string; label: string };
export type GapSuggestion = {
  key: string;
  title: string;
  reason: string;
  slotKind: SlotKind;
  cups: Cup[];
  slots: GapSlot[];
};

const HUB_KIND_FOR: Record<SlotKind, string> = {
  training: "training",
  friend: "friend_plan",
  family: "family_touchpoint",
  date: "date",
  ceo_block: "ceo_block",
  operating_review: "operating_review",
  enjoyable: "enjoyable",
  rest: "rest",
};

type SlotState = "idle" | "loading" | "added" | { error: string };

function CupSwatch({ cup }: { cup: Cup }) {
  const meta = CUP_META[cup];
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(${meta.colorVar})` }} title={meta.label} />;
}

function AddSlotPill({ suggestion, slot }: { suggestion: GapSuggestion; slot: GapSlot }) {
  const router = useRouter();
  const [state, setState] = useState<SlotState>("idle");

  async function add() {
    setState("loading");
    try {
      const res = await fetch("/hub/api/calendar/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ summary: suggestion.title, start: slot.start, end: slot.end, hubKind: HUB_KIND_FOR[suggestion.slotKind] }),
      });
      if (!res.ok) {
        const msg =
          res.status === 400 ? "Choose your private calendar in Settings first" : res.status === 409 ? "Connect Google in Settings" : "Couldn't add that";
        setState({ error: msg });
        return;
      }
      setState("added");
      router.refresh();
      setTimeout(() => setState("idle"), 5000);
    } catch {
      setState({ error: "Couldn't add that" });
    }
  }

  const errorMsg = typeof state === "object" ? state.error : null;
  const added = state === "added";
  const loading = state === "loading";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={add}
        disabled={loading || added}
        className={`hub-press inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold ${added ? "bg-good/15 text-good" : "hub-elevated text-ink-2"}`}
      >
        <span className="hub-tabular">{slot.label}</span>
        {added ? (
          "Added"
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-tint px-2 py-1 text-[11px] font-bold text-white">
            {loading ? "Adding…" : (
              <>
                <Plus size={11} aria-hidden /> Add
              </>
            )}
          </span>
        )}
      </button>
      {errorMsg ? <span className="max-w-[220px] text-[11px] leading-snug text-bad">{errorMsg}</span> : null}
    </div>
  );
}

/** The hero card: this week's shortfalls as named suggestions, each with slots you can add in one tap. */
export function GapsCard({ title = "This week's gaps", suggestions }: { title?: string; suggestions: GapSuggestion[] }) {
  return (
    <section className="hub-card p-5">
      <h2 className="hub-eyebrow">{title}</h2>
      {suggestions.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-2">Nothing missing this week — enjoy it.</p>
      ) : (
        <ul className="mt-1 flex flex-col divide-y divide-hairline">
          {suggestions.map((s) => (
            <li key={s.key} className="py-3 first:pt-2 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-ink">{s.title}</div>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{s.reason}</p>
                </div>
                {s.cups.length > 0 ? (
                  <div className="mt-1.5 flex shrink-0 items-center gap-1">
                    {s.cups.map((c) => (
                      <CupSwatch key={c} cup={c} />
                    ))}
                  </div>
                ) : null}
              </div>
              {s.slots.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {s.slots.slice(0, 3).map((slot) => (
                    <AddSlotPill key={slot.start} suggestion={s} slot={slot} />
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
