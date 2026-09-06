"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, Calendar, CircleDot, Dumbbell, ListChecks, Loader2, NotebookPen, Pill, Search, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { renderMarkdownLite } from "./markdown";
import { ActionCard } from "./ActionCard";
import type { ThreadItem } from "./useCoachStream";

const TOOL_ICON: Record<string, LucideIcon> = {
  get_state: Search,
  get_gaps: ListChecks,
  log_activity: Dumbbell,
  log_meal: Utensils,
  repeat_meal: Utensils,
  log_medication: Pill,
  create_calendar_block: Calendar,
  set_checkin: NotebookPen,
  list_recent: Search,
};

function ReceiptChip({ item }: { item: Extract<ThreadItem, { kind: "receipt" }> }) {
  const Icon = item.isError ? AlertCircle : (TOOL_ICON[item.name] ?? CircleDot);
  return (
    <div
      className={`hub-elevated inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold ${
        item.isError ? "text-bad" : "text-ink-2"
      }`}
    >
      {item.running ? <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden /> : <Icon size={14} aria-hidden />}
      <span className="truncate">{item.summary}</span>
    </div>
  );
}

export function Thread({
  items,
  streaming,
  loading,
  busy,
  onConfirm,
  onCancel,
}: {
  items: ThreadItem[];
  streaming: boolean;
  loading: boolean;
  busy: boolean;
  onConfirm: (id: string, input: Record<string, unknown>) => void;
  onCancel: (id: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-1 py-6 text-[13px] font-medium text-ink-3">
        <Loader2 size={14} className="motion-safe:animate-spin" aria-hidden />
        Loading the conversation…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-1 py-6 text-[15px] text-ink-2">Ask about today, plan the week, or log something — I’ll take it from here.</div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        switch (item.kind) {
          case "user":
            return (
              <div key={item.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-[18px] rounded-br-[4px] bg-ink px-4 py-2.5 text-[15px] leading-snug text-page">
                  {item.text}
                </div>
              </div>
            );
          case "assistant":
            return (
              <div key={item.id} className="flex justify-start">
                <div className="hub-card max-w-[85%] rounded-[18px] rounded-bl-[4px] px-4 py-2.5 text-[15px] leading-snug">
                  {renderMarkdownLite(item.text)}
                  {item.streaming ? <span className="motion-safe:animate-pulse text-ink-3">▍</span> : null}
                </div>
              </div>
            );
          case "receipt":
            return (
              <div key={item.id} className="flex justify-start">
                <ReceiptChip item={item} />
              </div>
            );
          case "pending":
            return <ActionCard key={item.id} id={item.id} name={item.name} input={item.input} busy={busy} onConfirm={onConfirm} onCancel={onCancel} />;
          case "error":
            return (
              <div key={item.id} className="flex items-center gap-2 rounded-tile border border-hairline px-3.5 py-2.5 text-[13px] font-medium text-bad">
                <AlertCircle size={14} aria-hidden />
                {item.message}
              </div>
            );
          default:
            return null;
        }
      })}
      {streaming && items[items.length - 1]?.kind === "user" ? (
        <div className="flex justify-start">
          <div className="hub-card flex items-center gap-1.5 rounded-[18px] rounded-bl-[4px] px-4 py-3">
            <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-ink-3" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-ink-3" style={{ animationDelay: "120ms" }} />
            <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-ink-3" style={{ animationDelay: "240ms" }} />
          </div>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
