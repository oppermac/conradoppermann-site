import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "../ai/anthropic";
import { MODELS } from "../ai/models";
import { MealEstimateSchema, type MealEstimate } from "./schema";

const SYSTEM = `You estimate the nutrition of a meal for Conrad, a 30s-something man in Dublin, Ireland, from a photo or a short description. Portions are Irish/UK restaurant and home portions unless stated. Work item by item: name each food, estimate its weight in grams and its calories and macros (protein, carbs, fat in grams), then total them. Round sensibly. Be honest in the confidence fields: hidden ingredients (oils, sauces, dressings) lower confidence. Ask at most one short clarifying question, only when the answer would change the estimate by more than 20% (for example "Cream-based sauce?" with options ["Yes", "No", "Not sure"]). If the image is not food, set quality_issue to "not_food"; if it is too dark, blurry or shows only part of the plate, set the matching quality_issue and still give your best estimate. Name the meal briefly (e.g. "Chicken salad with sourdough"). Pick the slot from the time of day when given.`;

type Ctx = { hint?: string | null; timeHint?: string | null; targets?: { kcal: number | null; proteinG: number | null } | null };

function contextText(ctx: Ctx): string {
  const parts: string[] = [];
  if (ctx.timeHint) parts.push(`Time now: ${ctx.timeHint}.`);
  if (ctx.targets?.kcal) parts.push(`Daily targets: ${ctx.targets.kcal} kcal, ${ctx.targets.proteinG ?? "?"} g protein.`);
  if (ctx.hint) parts.push(`Conrad says: ${ctx.hint}`);
  return parts.join(" ");
}

async function run(model: string, content: Array<{ type: "image"; source: { type: "url"; url: string } } | { type: "text"; text: string }>) {
  const response = await anthropic().messages.parse({
    model,
    max_tokens: 3000,
    system: SYSTEM,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(MealEstimateSchema) },
  });
  return { estimate: response.parsed_output, raw: response.content, usage: response.usage };
}

export type VisionResult = { estimate: MealEstimate; model: string; raw: unknown };

/** Photo → estimate. Haiku first; Sonnet when Haiku is unsure. The image block goes before the text. */
export async function analyzeMealPhoto(photoUrl: string, ctx: Ctx = {}): Promise<VisionResult> {
  const content = [
    { type: "image" as const, source: { type: "url" as const, url: photoUrl } },
    { type: "text" as const, text: `Estimate this meal. ${contextText(ctx)}`.trim() },
  ];
  const first = await run(MODELS.vision, content);
  if (first.estimate && first.estimate.confidence >= 0.5 && first.estimate.quality_issue !== "not_food") {
    return { estimate: first.estimate, model: MODELS.vision, raw: first.raw };
  }
  const second = await run(MODELS.visionFallback, content);
  const estimate = second.estimate ?? first.estimate;
  if (!estimate) throw new Error("Couldn't read this one. Try again, or log it as text.");
  return { estimate, model: second.estimate ? MODELS.visionFallback : MODELS.vision, raw: second.raw };
}

/** "2 eggs, sourdough, half an avocado" → estimate. */
export async function parseMealText(text: string, ctx: Ctx = {}): Promise<VisionResult> {
  const content = [{ type: "text" as const, text: `Estimate this meal from the description: "${text}". ${contextText(ctx)}`.trim() }];
  const first = await run(MODELS.vision, content);
  if (first.estimate) return { estimate: first.estimate, model: MODELS.vision, raw: first.raw };
  const second = await run(MODELS.visionFallback, content);
  if (!second.estimate) throw new Error("Couldn't understand that meal. Try naming the foods and rough amounts.");
  return { estimate: second.estimate, model: MODELS.visionFallback, raw: second.raw };
}
