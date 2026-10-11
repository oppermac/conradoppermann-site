/**
 * "Tell Claude" quick log: one free-text note → every loggable thing in it, with dates inferred
 * ("last night" = yesterday evening). No conversation is persisted; calendar writes are excluded.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../ai/anthropic";
import { MODELS } from "../ai/models";
import { COACH_PERSONA } from "../ai/persona";
import { addDays, dublin } from "../time";
import { executeTool } from "./execute";
import { QUICK_LOG_TOOLS } from "./tools";

export type QuickLogAction = { name: string; summary: string; isError: boolean; data?: unknown };
export type QuickLogResult = { reply: string; actions: QuickLogAction[] };

const MAX_ROUNDS = 5;

function instructions(): string {
  const now = dublin();
  const yesterday = addDays(now.dayKey, -1);
  return `Conrad typed a quick note from the Log menu. Log everything in it with the tools, then confirm in one short line. Do not ask questions: make the most likely assumption and state it in the confirmation.

Now in Dublin: ${now.dayKey} ${now.hhmm} (${now.weekday}). Yesterday was ${yesterday}.
Dates and times: "last night" = ${yesterday} around 20:00 (dinner); "this morning" = today 08:00 (breakfast); "lunch" = 13:00; "after the gym" = today, now; no time given = now. Always pass eaten_at / occurred_at / taken_at as "YYYY-MM-DD HH:MM" Dublin time (null only when it genuinely means now).
Meals and drinks: log_meal, one call per meal, with the right slot. Alcohol counts as food: log_meal with the drinks (e.g. "3 pints of Guinness") as a snack at the time he drank, and if he was with people also log_activity (friend_plan, quality_time, family_touchpoint or date as appropriate) with their first names and the venue in title.
Time with people, training, walks, nature, gigs, reading, meditation: log_activity with the closest type_id.
Supplements and medication: log_medication.
Mood, energy, weight, gratitude: set_checkin for the right day.
Several things in one note → several tool calls (parallel is fine). If a meal was already logged today with the same name, do not log it twice; say so.
Food constraints you can mention when relevant: no gluten, dairy, eggs or fish; gut repair is a goal.
Final reply: one line, under 40 words, plain text, listing what was logged with the day if not today.`;
}

export async function runQuickLog(text: string): Promise<QuickLogResult> {
  const client = anthropic();
  const actions: QuickLogAction[] = [];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: [{ type: "text", text }] }];
  let reply = "";

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await client.beta.messages.create({
      model: MODELS.coach,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: COACH_PERSONA, cache_control: { type: "ephemeral" } },
        { type: "text", text: instructions() },
      ],
      messages,
      tools: QUICK_LOG_TOOLS,
      tool_choice: { type: "auto" },
      output_config: { effort: "low" },
    });
    messages.push({ role: "assistant", content: res.content as unknown as Anthropic.Beta.BetaContentBlockParam[] });
    reply = res.content.filter((b) => b.type === "text").map((b) => (b.type === "text" ? b.text : "")).join("").trim() || reply;
    const uses = res.content.filter((b) => b.type === "tool_use");
    if (uses.length === 0 || res.stop_reason !== "tool_use") break;

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const u of uses) {
      if (u.type !== "tool_use") continue;
      const outcome = await executeTool(u.name, (u.input ?? {}) as Record<string, unknown>);
      if (!["get_state", "get_gaps", "list_recent"].includes(u.name)) actions.push({ name: u.name, summary: outcome.summary, isError: Boolean(outcome.isError), data: outcome.data });
      results.push({ type: "tool_result", tool_use_id: u.id, content: [{ type: "text", text: outcome.text }], is_error: Boolean(outcome.isError) });
    }
    messages.push({ role: "user", content: results });
  }
  return { reply: reply || (actions.length ? "Logged." : "Nothing to log in that."), actions };
}
