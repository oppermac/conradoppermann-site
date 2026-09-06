"use client";

/**
 * Owns the coach thread's state: loads a conversation, streams a turn from POST /hub/api/coach/chat or
 * /hub/api/coach/action (SSE, `data: <json>\n\n` lines — no EventSource since these are POSTs), and folds
 * both live events and a loaded conversation's stored blocks into one flat, easy-to-render item list.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type ThreadItem =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string; streaming: boolean }
  | { kind: "receipt"; id: string; name: string; summary: string; isError: boolean; running: boolean }
  | { kind: "pending"; id: string; name: string; input: Record<string, unknown>; summary: string }
  | { kind: "error"; id: string; message: string };

type CoachEvent =
  | { type: "start"; conversationId: string }
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; name: string; summary: string; isError: boolean; data?: unknown }
  | { type: "confirm"; id: string; name: string; input: unknown; summary: string }
  | { type: "done"; conversationId: string }
  | { type: "error"; message: string };

type ApiContentBlock = { type: string; [key: string]: unknown };
type ApiMessage = { id: string; role: "user" | "assistant"; createdAt: string; blocks: ApiContentBlock[] };
type ApiPending = { id: string; name: string; input: Record<string, unknown> } | null;

const RUNNING_LABEL: Record<string, string> = {
  get_state: "Checking your state…",
  get_gaps: "Checking your gaps…",
  log_activity: "Logging…",
  log_meal: "Logging your meal…",
  repeat_meal: "Repeating your meal…",
  log_medication: "Noting medication…",
  create_calendar_block: "Adding to calendar…",
  set_checkin: "Saving your check-in…",
  list_recent: "Looking up recent entries…",
};

function runningLabel(name: string): string {
  return RUNNING_LABEL[name] ?? "Working…";
}

function describePending(name: string, input: Record<string, unknown>): string {
  if (name === "create_calendar_block") return `${input.title ?? "Block"} · ${input.start} → ${input.end}`;
  return name.replace(/_/g, " ");
}

/** Converts a loaded conversation's stored Anthropic blocks into the flat item list the thread renders. */
export function historyToItems(messages: ApiMessage[], pending: ApiPending): ThreadItem[] {
  const results = new Map<string, { text: string; isError: boolean }>();
  for (const m of messages) {
    if (m.role !== "user") continue;
    for (const b of m.blocks) {
      if (b.type === "tool_result") {
        const content = b.content as Array<{ type: string; text?: string }> | undefined;
        const text = (content ?? [])
          .map((c) => c.text ?? "")
          .join(" ")
          .trim();
        results.set(String(b.tool_use_id), { text, isError: Boolean(b.is_error) });
      }
    }
  }

  const items: ThreadItem[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      const textBlocks = m.blocks.filter((b) => b.type === "text") as unknown as Array<{ text: string }>;
      if (textBlocks.length === 0) continue; // pure tool_result plumbing, already folded into `results`
      items.push({ kind: "user", id: m.id, text: textBlocks.map((b) => b.text).join("\n") });
      continue;
    }
    for (const b of m.blocks) {
      if (b.type === "text") {
        const text = (b as unknown as { text: string }).text;
        if (text.trim()) items.push({ kind: "assistant", id: `${m.id}-${items.length}`, text, streaming: false });
      } else if (b.type === "tool_use") {
        const id = String(b.id);
        const name = String(b.name);
        const input = (b.input ?? {}) as Record<string, unknown>;
        if (pending && pending.id === id) {
          items.push({ kind: "pending", id, name, input, summary: describePending(name, input) });
          continue;
        }
        const result = results.get(id);
        if (result) {
          items.push({ kind: "receipt", id, name, summary: result.text || name.replace(/_/g, " "), isError: result.isError, running: false });
        }
      }
    }
  }
  return items;
}

export type UseCoachStreamOptions = {
  initialConversationId?: string | null;
  initialItems?: ThreadItem[];
  /** false disables all network calls (the /hub/dev/coach fixture route). */
  network?: boolean;
};

let uid = 0;
function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${Date.now()}-${uid}`;
}

export function useCoachStream(opts: UseCoachStreamOptions = {}) {
  const network = opts.network !== false;
  const [conversationId, setConversationId] = useState<string | null>(opts.initialConversationId ?? null);
  const [items, setItems] = useState<ThreadItem[]>(opts.initialItems ?? []);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  useEffect(() => {
    if (!network) return;
    const id = opts.initialConversationId;
    if (!id || (opts.initialItems && opts.initialItems.length > 0)) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetch(`/hub/api/coach/conversations/${id}`)
      .then((r) => r.json())
      .then((data: { error?: string; messages?: ApiMessage[]; pending?: ApiPending }) => {
        if (cancelled || data.error || !data.messages) return;
        setItems(historyToItems(data.messages, data.pending ?? null));
      })
      .catch(() => {
        if (!cancelled) setItems([{ kind: "error", id: nextId("err"), message: "Couldn't load that conversation." }]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const consumeStream = useCallback(async (res: Response) => {
    if (!res.ok || !res.body) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setItems((prev) => [...prev, { kind: "error", id: nextId("err"), message: data.error ?? `The coach didn't respond (${res.status}).` }]);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let assistantId: string | null = null;

    const finalizeAssistant = () => {
      if (!assistantId) return;
      const id = assistantId;
      setItems((prev) => prev.map((it) => (it.kind === "assistant" && it.id === id ? { ...it, streaming: false } : it)));
      assistantId = null;
    };

    const upsertReceipt = (id: string, name: string, summary: string, isError: boolean, running: boolean) => {
      setItems((prev) => {
        const idx = prev.findIndex((it) => it.id === id && (it.kind === "receipt" || it.kind === "pending"));
        if (idx === -1) return [...prev, { kind: "receipt", id, name, summary, isError, running }];
        const next = [...prev];
        next[idx] = { kind: "receipt", id, name, summary, isError, running };
        return next;
      });
    };

    const handle = (evt: CoachEvent) => {
      switch (evt.type) {
        case "start":
          setConversationId(evt.conversationId);
          break;
        case "text": {
          if (!assistantId) {
            const id = nextId("asst");
            assistantId = id;
            setItems((prev) => [...prev, { kind: "assistant", id, text: evt.text, streaming: true }]);
          } else {
            const id = assistantId;
            setItems((prev) => prev.map((it) => (it.kind === "assistant" && it.id === id ? { ...it, text: it.text + evt.text } : it)));
          }
          break;
        }
        case "tool_start":
          finalizeAssistant();
          upsertReceipt(evt.id, evt.name, runningLabel(evt.name), false, true);
          break;
        case "tool_result":
          finalizeAssistant();
          upsertReceipt(evt.id, evt.name, evt.summary, evt.isError, false);
          break;
        case "confirm": {
          finalizeAssistant();
          const input = (evt.input ?? {}) as Record<string, unknown>;
          setItems((prev) => [...prev, { kind: "pending", id: evt.id, name: evt.name, input, summary: evt.summary }]);
          break;
        }
        case "done":
          finalizeAssistant();
          break;
        case "error":
          finalizeAssistant();
          setItems((prev) => [...prev, { kind: "error", id: nextId("err"), message: evt.message }]);
          break;
      }
    };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        try {
          handle(JSON.parse(json) as CoachEvent);
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }, []);

  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      if (!network) {
        setItems((prev) => [...prev, { kind: "user", id: nextId("u"), text: trimmed }]);
        return;
      }
      setItems((prev) => [...prev, { kind: "user", id: nextId("u"), text: trimmed }]);
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/hub/api/coach/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: conversationIdRef.current, message: trimmed }),
          signal: controller.signal,
        });
        await consumeStream(res);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setItems((prev) => [...prev, { kind: "error", id: nextId("err"), message: "The connection dropped before the coach replied." }]);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [network, consumeStream],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const act = useCallback(
    async (toolUseId: string, decision: "confirm" | "cancel", input?: Record<string, unknown>) => {
      if (!network) {
        setItems((prev) =>
          prev.map((it) => {
            if (it.kind !== "pending" || it.id !== toolUseId) return it;
            return decision === "confirm"
              ? { kind: "receipt", id: it.id, name: it.name, summary: `Added to calendar: ${String(it.input.title ?? "Event")}`, isError: false, running: false }
              : { kind: "receipt", id: it.id, name: it.name, summary: "Cancelled", isError: false, running: false };
          }),
        );
        return;
      }
      const id = conversationIdRef.current;
      if (!id) return;
      setItems((prev) =>
        prev.map((it) => {
          if (it.kind !== "pending" || it.id !== toolUseId) return it;
          return decision === "confirm"
            ? { kind: "receipt", id: it.id, name: it.name, summary: runningLabel(it.name), isError: false, running: true }
            : { kind: "receipt", id: it.id, name: it.name, summary: "Cancelled", isError: false, running: false };
        }),
      );
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/hub/api/coach/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: id, toolUseId, decision, input }),
          signal: controller.signal,
        });
        await consumeStream(res);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setItems((prev) => [...prev, { kind: "error", id: nextId("err"), message: "The connection dropped before the coach replied." }]);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [network, consumeStream],
  );

  return { conversationId, items, streaming, loading, send, stop, act };
}
