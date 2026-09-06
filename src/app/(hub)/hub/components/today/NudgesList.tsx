"use client";

import { useState } from "react";
import Link from "next/link";
import type { TodayData } from "@/lib/hub/queries/today";

type ConnectedToday = Extract<TodayData, { dbConnected: true }>;

/** Unread nudges as quiet banners. Dismiss PATCHes the insight read; Open hands it to the coach. */
export function NudgesList({ nudges }: { nudges: ConnectedToday["nudges"] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const unread = nudges.filter((n) => !n.readAt && !dismissed.has(n.id));
  if (unread.length === 0) return null;

  async function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await fetch(`/hub/api/insights/${id}`, { method: "PATCH" });
    } catch {
      // Stays dismissed locally; a real refresh will reconcile with the server.
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {unread.map((n) => (
        <div key={n.id} className="hub-elevated flex items-start justify-between gap-3 rounded-tile p-4">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink">{n.title}</div>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{n.body}</p>
            <Link href={`/hub/coach?seed=nudge:${n.id}`} className="hub-press mt-1.5 inline-block py-1 text-[13px] font-semibold text-tint">
              Open
            </Link>
          </div>
          <button type="button" onClick={() => dismiss(n.id)} className="hub-press shrink-0 py-1 text-[13px] font-semibold text-ink-3">
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
