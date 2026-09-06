"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, MessagesSquare, Sparkles } from "lucide-react";
import type { CoachData } from "@/lib/hub/queries/coach";
import { renderMarkdownLite } from "./markdown";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { Thread } from "./Thread";
import { Composer } from "./Composer";
import { useCoachStream, type ThreadItem } from "./useCoachStream";

function resolveSeed(seed: string | null | undefined): string {
  if (!seed) return "";
  if (seed === "brief") return "About today's brief: ";
  if (seed === "plan") return "Plan my week from the gaps and free slots.";
  if (seed === "review") return "Review my week.";
  return seed;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function CoachView({
  data,
  seed = null,
  initialConversationId = null,
  network = true,
  initialItems,
}: {
  data: CoachData;
  seed?: string | null;
  initialConversationId?: string | null;
  network?: boolean;
  initialItems?: ThreadItem[];
}) {
  const { items, streaming, loading, send, stop, act, conversationId } = useCoachStream({
    initialConversationId,
    initialItems,
    network,
  });
  const [draft, setDraft] = useState("");
  const [focusToken, setFocusToken] = useState(0);

  useEffect(() => {
    if (!seed) return;
    queueMicrotask(() => {
      setDraft(resolveSeed(seed));
      setFocusToken((t) => t + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function seedComposer(text: string) {
    setDraft(text);
    setFocusToken((t) => t + 1);
  }

  function handleSend(text: string) {
    setDraft("");
    void send(text);
  }

  const brief = data.brief;
  const briefCard = (
    <section className="hub-card p-5">
      <div className="hub-eyebrow">Today’s brief</div>
      {brief ? (
        <>
          <h2 className="mt-1 text-[17px] font-semibold leading-snug">{brief.title}</h2>
          <div className="mt-2 text-[15px] leading-snug text-ink-2 [&_ul]:mt-1 [&_ol]:mt-1 [&_p+p]:mt-2">
            {renderMarkdownLite(brief.bodyMd)}
          </div>
          <div className="mt-3 flex items-center gap-4">
            <Link href={`/hub/insights/${brief.id}`} className="hub-press text-[13px] font-semibold text-tint">
              Open
            </Link>
            <button type="button" onClick={() => seedComposer("About today's brief: ")} className="hub-press text-[13px] font-semibold text-tint">
              Ask a follow-up
            </button>
          </div>
        </>
      ) : (
        <p className="mt-1 text-[15px] text-ink-2">No brief yet today — ask the coach and one will be on its way.</p>
      )}
    </section>
  );

  const railActions = (
    <div className="hub-card flex flex-col gap-1 p-2">
      <button
        type="button"
        onClick={() => seedComposer("Plan my week from the gaps and free slots.")}
        className="hub-press flex items-center gap-2.5 rounded-tile px-3 py-2.5 text-left text-[15px] font-semibold hover:bg-ink/5"
      >
        <Sparkles size={17} className="text-tint" aria-hidden />
        Plan my week
      </button>
      <button
        type="button"
        onClick={() => seedComposer("Review my week.")}
        className="hub-press flex items-center gap-2.5 rounded-tile px-3 py-2.5 text-left text-[15px] font-semibold hover:bg-ink/5"
      >
        <CalendarDays size={17} className="text-tint" aria-hidden />
        Review my week
      </button>
    </div>
  );

  const conversationsList = (
    <div className="hub-card flex flex-col gap-1 p-2">
      <div className="hub-eyebrow px-3 pt-1.5">Conversations</div>
      <Link
        href="/hub/coach"
        className={`hub-press flex items-center gap-2.5 rounded-tile px-3 py-2.5 text-[14px] font-semibold hover:bg-ink/5 ${
          !conversationId ? "text-tint" : ""
        }`}
      >
        <MessagesSquare size={16} aria-hidden />
        New conversation
      </Link>
      {data.conversations.length === 0 ? (
        <p className="px-3 py-2 text-[13px] text-ink-2">Nothing yet — start below.</p>
      ) : (
        data.conversations.map((c) => (
          <Link
            key={c.id}
            href={`/hub/coach?c=${c.id}`}
            className={`flex flex-col rounded-tile px-3 py-2 hover:bg-ink/5 ${c.id === conversationId ? "bg-tint/10" : ""}`}
          >
            <span className="truncate text-[14px] font-medium">{c.title}</span>
            <span className="text-[12px] text-ink-3">{timeAgo(c.lastMessageAt)}</span>
          </Link>
        ))
      )}
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-6">
      <div className="lg:hidden">{briefCard}</div>

      <div className="mt-4 flex flex-col gap-4 lg:mx-auto lg:mt-0 lg:w-full lg:max-w-[720px]">
        <SuggestedPrompts onPick={handleSend} disabled={streaming} />
        <Thread items={items} streaming={streaming} loading={loading} busy={streaming} onConfirm={(id, input) => void act(id, "confirm", input)} onCancel={(id) => void act(id, "cancel")} />
        <Composer value={draft} onChange={setDraft} onSend={handleSend} streaming={streaming} onStop={stop} focusToken={focusToken} />
      </div>

      <aside className="hidden lg:flex lg:flex-col lg:gap-4">
        {briefCard}
        {railActions}
        {conversationsList}
      </aside>
    </div>
  );
}
