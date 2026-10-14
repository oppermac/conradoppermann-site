/**
 * "What should I eat?": what's in the fridge + what's left of today's targets → one concrete meal.
 * Structured output so the panel can show items and totals and log it in one tap once eaten.
 */
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "../ai/anthropic";
import { MODELS } from "../ai/models";
import { COACH_PERSONA } from "../ai/persona";
import { targetsForDay } from "../meals/day-targets";
import { dailyTotals, mealsForDay } from "../meals/store";
import { getSettings } from "../settings";
import { dublin } from "../time";

export const MealAdviceSchema = z.object({
  headline: z.string().max(80).describe("The meal in one line, e.g. 'Chicken, waffle fries and roasted peppers'"),
  items: z
    .array(z.object({ name: z.string(), portion: z.string().describe("Weight or count, raw weights for meat"), kcal: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number() }))
    .min(1)
    .max(8),
  totals: z.object({ kcal: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number() }),
  why: z.string().max(220).describe("One or two plain sentences: what this closes and what it protects"),
  also: z.string().max(160).nullable().describe("Optional: what to do with what's left of the day (a scoop, a Coke Zero, nothing), or null"),
  log_text: z.string().max(240).describe("The meal as Conrad would type it to log it after eating, with the portions"),
});
export type MealAdvice = z.infer<typeof MealAdviceSchema>;

const INSTRUCTIONS = `Conrad is asking what to eat next. Use only the food he lists (plus oil, salt, spices and basic condiments). Respect his constraints from the persona: no gluten, dairy, eggs or fish; red meat at most three times a week; gut goal. Choose portions that close today's remaining protein first, keep fat inside what is left, and use carbs to land near the remaining kcal. Raw weights for meat, pack weights for frozen items. If the remaining fat is already spent, make the meal as lean as the ingredients allow and say so plainly. Keep "why" to two short sentences, no lecturing. Zero-calorie drinks cost nothing; say so in "also" if he mentions them.`;

export async function adviseMeal(have: string): Promise<{ advice: MealAdvice; remaining: { kcal: number; proteinG: number; carbsG: number; fatG: number }; trainingDay: boolean }> {
  const now = dublin();
  const { settings } = await getSettings();
  const targets = await targetsForDay(now.dayKey, settings.nutrition);
  const totals = await dailyTotals(now.dayKey);
  const eaten = (await mealsForDay(now.dayKey)).map((m) => `${m.name} (${m.kcal} kcal, ${Math.round(m.proteinG)} g protein, ${Math.round(m.fatG)} g fat)`);
  const remaining = {
    kcal: Math.max(0, (targets.kcal ?? 0) - totals.kcal),
    proteinG: Math.max(0, (targets.proteinG ?? 0) - totals.proteinG),
    carbsG: Math.max(0, (targets.carbsG ?? 0) - totals.carbsG),
    fatG: Math.max(0, (targets.fatG ?? 0) - totals.fatG),
  };
  const state = {
    now: `${now.dayKey} ${now.hhmm} (${now.weekday})`,
    dayType: targets.trainingDay ? "training day" : "rest day",
    targets: { kcal: targets.kcal, proteinG: targets.proteinG, carbsG: targets.carbsG, fatG: targets.fatG },
    eatenToday: eaten.length ? eaten : ["nothing logged yet"],
    remaining,
  };
  const res = await anthropic().messages.parse({
    model: MODELS.coach,
    max_tokens: 1500,
    system: [
      { type: "text", text: COACH_PERSONA, cache_control: { type: "ephemeral" } },
      { type: "text", text: `${INSTRUCTIONS}\n\nToday:\n${JSON.stringify(state)}` },
    ],
    messages: [{ role: "user", content: `What I have: ${have}` }],
    output_config: { format: zodOutputFormat(MealAdviceSchema), effort: "low" },
  });
  if (!res.parsed_output) throw new Error("Couldn’t come up with a meal from that.");
  return { advice: res.parsed_output, remaining, trainingDay: targets.trainingDay };
}
