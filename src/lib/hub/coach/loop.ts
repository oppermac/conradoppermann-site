/**
 * Coach turn: streams Opus 5 with tools; logging tools run immediately, calendar writes pause for confirmation.
 * At most one tool call per assistant message (disable_parallel_tool_use) so a pause is always clean.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { asc, eq } from "drizzle-orm";
import { anthropic } from "../ai/anthropic";
import { buildContext } from "../ai/context";
import { MODELS } from "../ai/models";
import { COACH_PERSONA } from "../ai/persona";
import { db } from "../db/client";
import { conversationMessages, conversations } from "../db/schema";
import { buildHistoryMessages } from "./compact-history";
import { executeTool } from "./execute";
import { COACH_TOOLS, CONFIRM_TOOLS } from "./tools";

export type CoachEvent =
  | { type: "start"; conversationId: string }
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; name: string; summary: string; isError: boolean; data?: unknown }
  | { type: "confirm"; id: string; name: string; input: unknown; summary: string }
  | { type: "done"; conversationId: string }
  | { type: "error"; message: string };

const MAX_ROUNDS = 6;

const CHAT_INSTRUCTIONS = `You are chatting with Conrad inside the hub. Answer from the state JSON below (it is fresh). Keep replies short — a few sentences, or a short list when he asks for a plan. Propose at most one action per reply and use the tools to do things he asks for: log activities, meals and medication immediately; for calendar blocks call create_calendar_block and he will confirm. When you propose a time, use the free slots from the state. Markdown: bold and lists only.`;

async function persist(conversationId: string, role: "user" | "assistant", content: unknown) {
  await db.insert(conversationMessages).values({ conversationId, role, content });
  await db.update(conversations).set({ lastMessageAt: new Date(), updatedAt: new Date() }).where(eq(conversations.id, conversationId));
}

function describe(name: string, input: Record<string, unknown>): string {
  if (name === "create_calendar_block") return `${input.title} · ${input.start} → ${input.end}`;
  return name.replace(/_/g, " ");
}

export async function runCoachTurn(opts: { conversationId: string; userText?: string; send: (e: CoachEvent) => void }) {
  const { conversationId, send } = opts;
  if (opts.userText) await persist(conversationId, "user", [{ type: "text", text: opts.userText }]);

  const rows = await db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, conversationId)).orderBy(asc(conversationMessages.createdAt));
  const history = buildHistoryMessages(rows.map((r) => ({ role: r.role, content: r.content })));
  const ctx = await buildContext();
  const client = anthropic();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stream = client.beta.messages.stream({
      model: MODELS.coach,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: COACH_PERSONA, cache_control: { type: "ephemeral" } },
        { type: "text", text: `${CHAT_INSTRUCTIONS}\n\nState:\n${JSON.stringify(ctx)}` },
      ],
      messages: history,
      tools: COACH_TOOLS,
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      output_config: { effort: "low" },
    });
    stream.on("text", (delta) => send({ type: "text", text: delta }));
    const final = await stream.finalMessage();
    await persist(conversationId, "assistant", final.content);
    history.push({ role: "assistant", content: final.content as unknown as Anthropic.Beta.BetaContentBlockParam[] });

    if (final.stop_reason === "refusal") {
      send({ type: "error", message: "The coach declined to answer that." });
      return;
    }
    const toolUse = final.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return;

    const input = (toolUse.input ?? {}) as Record<string, unknown>;
    if (CONFIRM_TOOLS.has(toolUse.name)) {
      send({ type: "confirm", id: toolUse.id, name: toolUse.name, input, summary: describe(toolUse.name, input) });
      return; // paused: /hub/api/coach/action resumes with the tool_result
    }
    send({ type: "tool_start", id: toolUse.id, name: toolUse.name, input });
    const outcome = await executeTool(toolUse.name, input);
    send({ type: "tool_result", id: toolUse.id, name: toolUse.name, summary: outcome.summary, isError: Boolean(outcome.isError), data: outcome.data });
    const resultBlock = { type: "tool_result" as const, tool_use_id: toolUse.id, content: [{ type: "text" as const, text: outcome.text }], is_error: Boolean(outcome.isError) };
    await persist(conversationId, "user", [resultBlock]);
    history.push({ role: "user", content: [resultBlock] });
  }
}

/** Resume after Conrad confirms or cancels a paused calendar action. */
export async function resumeAfterAction(opts: {
  conversationId: string;
  toolUseId: string;
  decision: "confirm" | "cancel";
  input?: Record<string, unknown>;
  send: (e: CoachEvent) => void;
}) {
  const { conversationId, toolUseId, decision, send } = opts;
  const rows = await db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, conversationId)).orderBy(asc(conversationMessages.createdAt));
  const last = rows[rows.length - 1];
  const blocks = (Array.isArray(last?.content) ? last.content : []) as Array<Record<string, unknown>>;
  const toolUse = last?.role === "assistant" ? blocks.find((b) => b.type === "tool_use" && b.id === toolUseId) : undefined;
  if (!toolUse) {
    send({ type: "error", message: "That action is no longer pending." });
    return;
  }
  const name = String(toolUse.name);
  const input = { ...((toolUse.input as Record<string, unknown>) ?? {}), ...(opts.input ?? {}) };
  let resultText: string;
  let isError = false;
  if (decision === "confirm") {
    send({ type: "tool_start", id: toolUseId, name, input });
    const outcome = await executeTool(name, input);
    send({ type: "tool_result", id: toolUseId, name, summary: outcome.summary, isError: Boolean(outcome.isError), data: outcome.data });
    resultText = outcome.text;
    isError = Boolean(outcome.isError);
  } else {
    resultText = "Conrad declined this action. Acknowledge briefly and do not retry it.";
  }
  const resultBlock = { type: "tool_result" as const, tool_use_id: toolUseId, content: [{ type: "text" as const, text: resultText }], is_error: isError };
  await persist(conversationId, "user", [resultBlock]);
  await runCoachTurn({ conversationId, send });
}
