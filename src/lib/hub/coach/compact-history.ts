/** Replays stored content blocks into Anthropic messages; compacts old tool results; repairs tool pairing. */
import type Anthropic from "@anthropic-ai/sdk";

export type StoredMessage = { role: "user" | "assistant"; content: unknown };

const FULL_FIDELITY_TAIL = 10;
const MAX_MESSAGES = 30;

export function buildHistoryMessages(rows: StoredMessage[]): Anthropic.Beta.BetaMessageParam[] {
  const recent = rows.slice(-MAX_MESSAGES);
  const cutoff = Math.max(0, recent.length - FULL_FIDELITY_TAIL);
  const mapped = recent.map((row, i) => {
    const blocks = (Array.isArray(row.content) ? row.content : []) as Array<Record<string, unknown>>;
    const compact = i < cutoff;
    const content = blocks.map((b) =>
      compact && b.type === "tool_result"
        ? { ...b, content: [{ type: "text", text: "(tool result from an earlier turn — details elided)" }] }
        : b,
    );
    return { role: row.role, content } as unknown as Anthropic.Beta.BetaMessageParam;
  });
  return pairToolBlocks(mapped);
}

/** The API rejects a tool_use that isn't answered by tool_results in the very next message; repair both directions. */
export function pairToolBlocks(messages: Anthropic.Beta.BetaMessageParam[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  let pending: string[] = [];
  const synthesized = (ids: string[]): Anthropic.Beta.BetaMessageParam => ({
    role: "user",
    content: ids.map((id) => ({ type: "tool_result" as const, tool_use_id: id, content: [{ type: "text" as const, text: "(no result was recorded for this tool call)" }] })),
  });
  for (const original of messages) {
    let msg = original;
    const blocks = Array.isArray(msg.content) ? (msg.content as unknown as Array<Record<string, unknown>>) : [];
    if (msg.role === "user") {
      const resultIds = new Set(blocks.filter((b) => b.type === "tool_result").map((b) => String(b.tool_use_id)));
      const unanswered = pending.filter((id) => !resultIds.has(id));
      if (unanswered.length && resultIds.size > 0) {
        msg = { role: "user", content: [...(synthesized(unanswered).content as unknown[]), ...blocks] } as unknown as Anthropic.Beta.BetaMessageParam;
      } else if (unanswered.length) {
        out.push(synthesized(unanswered));
      }
      const pendingSet = new Set(pending);
      const kept = (Array.isArray(msg.content) ? msg.content : []).filter((b) => {
        const block = b as unknown as Record<string, unknown>;
        return block.type !== "tool_result" || pendingSet.has(String(block.tool_use_id));
      });
      pending = [];
      if (!kept.length) continue;
      out.push({ role: "user", content: kept } as unknown as Anthropic.Beta.BetaMessageParam);
      continue;
    }
    pending = blocks.filter((b) => b.type === "tool_use").map((b) => String(b.id));
    out.push(msg);
  }
  if (pending.length) out.push(synthesized(pending));
  return out;
}
