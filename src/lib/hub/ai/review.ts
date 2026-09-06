import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { eq } from "drizzle-orm";
import { anthropic } from "./anthropic";
import { buildContext } from "./context";
import { MODELS } from "./models";
import { COACH_PERSONA } from "./persona";
import { db } from "../db/client";
import { insights } from "../db/schema";
import { weekFacts } from "../domain/facts";
import { ragAtEnd } from "../domain/kpis";
import { notify } from "../notify/send";
import { getSettings } from "../settings";
import { addDays, dayKey, weekKey, weekRange } from "../time";

export const ReviewSchema = z.object({
  headline: z.string().max(110),
  scorecard: z.array(z.object({ domain: z.enum(["work", "body", "relationships", "aliveness"]), score: z.number().min(0).max(10), hits: z.string().max(140), misses: z.string().max(140) })).length(4),
  wins: z.array(z.string().max(140)).max(3),
  adjust: z.array(z.string().max(140)).max(3),
  next_week: z.array(z.object({ domain: z.enum(["work", "body", "relationships", "aliveness"]), commitment: z.string().max(120), when: z.string().max(40) })).max(4),
  reflection_question: z.string().max(160),
  body_md: z.string().max(1800),
});
export type Review = z.infer<typeof ReviewSchema>;

const INSTRUCTIONS = `Write Conrad's Sunday review of the week that is ending, from the JSON. Score each domain 0–10 from the behaviour counts (green = 8–10, amber = 5–7, red = 0–4, adjusted by the trend against last week). wins: two or three things that worked, with numbers. adjust: two or three specific changes for next week. next_week: up to four commitments with a concrete "when" (a day and time), preferring the free slots and people the state names. One reflection question he can answer in a sentence. body_md is the readable review (≤ 250 words), warm and direct.`;

export async function generateReview(opts: { weekOf?: string; force?: boolean } = {}) {
  const today = opts.weekOf ?? dayKey();
  const wk = weekKey(today);
  const dedupeKey = `review:${wk}`;
  if (!opts.force) {
    const [existing] = await db.select().from(insights).where(eq(insights.dedupeKey, dedupeKey)).limit(1);
    if (existing) return { insight: existing, created: false };
  }
  const { settings } = await getSettings();
  const ctx = await buildContext();
  const { start, end } = weekRange(wk);
  const lastWeekFacts = await weekFacts(addDays(start, -1), settings);
  const lastWeek = lastWeekFacts.map((f) => ({ id: f.id, done: f.done, target: f.target, rag: ragAtEnd(f) }));
  const response = await anthropic().beta.messages.parse({
    model: MODELS.review,
    max_tokens: 6000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: COACH_PERSONA, cache_control: { type: "ephemeral" } },
      { type: "text", text: INSTRUCTIONS },
    ],
    messages: [{ role: "user", content: `Week ${wk} (${start} to ${end}). Current state:\n${JSON.stringify(ctx)}\n\nLast week for comparison:\n${JSON.stringify(lastWeek)}` }],
    output_config: { effort: "high", format: zodOutputFormat(ReviewSchema) },
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined to write the review");
  const review = response.parsed_output;
  if (!review) throw new Error("The review came back malformed");
  const [row] = await db
    .insert(insights)
    .values({
      kind: "review",
      forDate: end,
      periodStart: start,
      periodEnd: end,
      title: review.headline,
      bodyMd: review.body_md,
      payload: { review, context: ctx, lastWeek },
      model: response.model,
      dedupeKey: opts.force ? `${dedupeKey}:${Date.now()}` : dedupeKey,
    })
    .returning();
  const sent = await notify({ title: "Your week in review is ready", body: review.headline, url: `/hub/insights/${row.id}`, tag: "review" });
  if (sent.push || sent.slack) await db.update(insights).set({ deliveredAt: new Date() }).where(eq(insights.id, row.id));
  return { insight: row, created: true };
}
