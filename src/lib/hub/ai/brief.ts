import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { eq } from "drizzle-orm";
import { anthropic } from "./anthropic";
import { buildContext } from "./context";
import { MODELS } from "./models";
import { COACH_PERSONA } from "./persona";
import { db } from "../db/client";
import { insights } from "../db/schema";
import { notify } from "../notify/send";
import { dayKey, formatDayLong } from "../time";

export const BriefSchema = z.object({
  headline: z.string().max(90),
  body_md: z.string().max(1400),
  top3: z.array(z.object({ domain: z.enum(["work", "body", "relationships", "aliveness"]), action: z.string().max(90), when: z.string().max(40) })).max(3),
  watchouts: z.array(z.string().max(120)).max(3),
});
export type Brief = z.infer<typeof BriefSchema>;

const INSTRUCTIONS = `Write Conrad's morning brief for today from the JSON state. Headline under 60 characters, plain. body_md at most 110 words in three paragraphs, each opening with a bold label: **The one thing.** first — one action with a time or a person, tied to the most at-risk behaviour or the lowest cup; then **Sleep.** — one line of numbers; then **The day.** — one line on the first commitment and anything to look forward to. No preamble, no hedging, no explanations of why things matter. top3 lists up to three concrete actions with a "when" (a time or day). watchouts are short facts. If quietWeek is true, drop the ask and keep it to sleep and the day.`;

export async function generateBrief(opts: { day?: string; force?: boolean } = {}) {
  const day = opts.day ?? dayKey();
  const dedupeKey = `brief:${day}`;
  if (!opts.force) {
    const [existing] = await db.select().from(insights).where(eq(insights.dedupeKey, dedupeKey)).limit(1);
    if (existing) return { insight: existing, created: false };
  }
  const ctx = await buildContext();
  const response = await anthropic().beta.messages.parse({
    model: MODELS.brief,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: COACH_PERSONA, cache_control: { type: "ephemeral" } },
      { type: "text", text: INSTRUCTIONS },
    ],
    messages: [{ role: "user", content: `Today is ${formatDayLong(day)}. State:\n${JSON.stringify(ctx)}` }],
    output_config: { effort: "medium", format: zodOutputFormat(BriefSchema) },
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined to write the brief");
  const brief = response.parsed_output;
  if (!brief) throw new Error("The brief came back malformed");

  const [row] = await db
    .insert(insights)
    .values({
      kind: "brief",
      forDate: day,
      title: brief.headline,
      bodyMd: brief.body_md,
      payload: { brief, context: ctx },
      model: response.model,
      dedupeKey: opts.force ? `${dedupeKey}:${Date.now()}` : dedupeKey,
    })
    .returning();
  const first = brief.top3[0];
  const sent = await notify({ title: brief.headline, body: first ? `${first.action} · ${first.when}` : brief.body_md.slice(0, 120), url: `/hub/insights/${row.id}`, tag: "brief" });
  if (sent.push || sent.slack) await db.update(insights).set({ deliveredAt: new Date() }).where(eq(insights.id, row.id));
  return { insight: row, created: true };
}
