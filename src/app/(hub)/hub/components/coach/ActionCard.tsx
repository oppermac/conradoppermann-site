"use client";

import { useState } from "react";
import { Calendar, Check, Pencil, X } from "lucide-react";
import { dublin, formatDayShort, localToUtc } from "@/lib/hub/time";

const KIND_LABEL: Record<string, string> = {
  ceo_block: "CEO Block",
  operating_review: "Operating Review",
  training: "Training",
  friend_plan: "Friend plan",
  family_touchpoint: "Family",
  date: "Date",
  enjoyable: "Something enjoyable",
  memorable: "Memorable",
  walk: "Walk",
  rest: "Rest",
};

/** Mirrors the server's `parseWhen`: "YYYY-MM-DD HH:MM"/"YYYY-MM-DDTHH:MM" Dublin local, or ISO with offset. */
function parseFlexible(raw: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/.exec(raw.trim());
  if (m) return localToUtc(m[1], m[2]);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDatetimeLocalValue(raw: string): string {
  const d = parseFlexible(raw);
  if (!d) return "";
  const dd = dublin(d);
  return `${dd.dayKey}T${dd.hhmm}`;
}

function formatRange(startRaw: string, endRaw: string): string {
  const s = parseFlexible(startRaw);
  const e = parseFlexible(endRaw);
  if (!s || !e) return `${startRaw} → ${endRaw}`;
  const sd = dublin(s);
  const ed = dublin(e);
  return `${formatDayShort(sd.dayKey)} ${sd.hhmm}–${ed.hhmm}`;
}

export function ActionCard({
  id,
  name,
  input,
  busy,
  onConfirm,
  onCancel,
}: {
  id: string;
  name: string;
  input: Record<string, unknown>;
  busy: boolean;
  onConfirm: (id: string, input: Record<string, unknown>) => void;
  onCancel: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(String(input.start ?? ""));
  const [end, setEnd] = useState(String(input.end ?? ""));

  if (name !== "create_calendar_block") {
    // Every confirm-tool today is a calendar block; keep a plain fallback so an unknown future tool still renders.
    return (
      <div className="hub-elevated flex flex-col gap-3 rounded-tile p-4">
        <div className="text-[15px] font-semibold">{name.replace(/_/g, " ")}</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(id, {})}
            className="hub-press flex h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-[15px] font-semibold text-page disabled:opacity-40"
          >
            <Check size={16} aria-hidden /> Confirm
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel(id)}
            className="hub-press flex h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-bad disabled:opacity-40"
          >
            <X size={16} aria-hidden /> Cancel
          </button>
        </div>
      </div>
    );
  }

  const title = String(input.title ?? "Block");
  const kind = String(input.kind ?? "");

  return (
    <div className="hub-elevated flex flex-col gap-3 rounded-tile p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint/12 text-tint">
          <Calendar size={18} aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink-2">Create block</div>
          <div className="mt-0.5 text-[15px] font-semibold leading-snug">
            {title}
            {kind && KIND_LABEL[kind] ? ` · ${KIND_LABEL[kind]}` : ""}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-2">{formatRange(start, end)} · Conrad’s Private Time</div>
        </div>
      </div>

      {editing ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-2">
            Start
            <input
              type="datetime-local"
              value={toDatetimeLocalValue(start)}
              onChange={(e) => setStart(e.target.value)}
              className="hub-tabular h-11 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-2">
            End
            <input
              type="datetime-local"
              value={toDatetimeLocalValue(end)}
              onChange={(e) => setEnd(e.target.value)}
              className="hub-tabular h-11 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onConfirm(id, { start, end })}
          className="hub-press flex h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-[15px] font-semibold text-page disabled:opacity-40"
        >
          <Check size={16} aria-hidden /> Confirm
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing((v) => !v)}
          className="hub-press flex h-11 items-center gap-1.5 rounded-full border border-hairline px-4 text-[15px] font-semibold disabled:opacity-40"
        >
          <Pencil size={16} aria-hidden /> {editing ? "Done" : "Edit"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onCancel(id)}
          className="hub-press flex h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-bad disabled:opacity-40"
        >
          <X size={16} aria-hidden /> Cancel
        </button>
      </div>
    </div>
  );
}
