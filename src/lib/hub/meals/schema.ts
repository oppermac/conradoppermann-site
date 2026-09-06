import { z } from "zod";

export const MealItemSchema = z.object({
  name: z.string(),
  portion: z.string(),
  grams: z.number().nullable(),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  confidence: z.number().min(0).max(1),
});

export const MealEstimateSchema = z.object({
  name: z.string(),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullable(),
  items: z.array(MealItemSchema),
  totals: z.object({
    kcal: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    fibre_g: z.number().nullable(),
  }),
  confidence: z.number().min(0).max(1),
  quality_issue: z.enum(["too_dark", "blurry", "not_food", "partial_view"]).nullable(),
  question: z.object({ text: z.string(), options: z.array(z.string()) }).nullable(),
  notes: z.string().nullable(),
});

export type MealEstimate = z.infer<typeof MealEstimateSchema>;
export type MealItemEstimate = z.infer<typeof MealItemSchema>;

/** What the client sends to save a meal (an edited estimate, a repeat, or a text log). */
export const SaveMealSchema = z.object({
  name: z.string().min(1).max(120),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  eatenAt: z.string().datetime({ offset: true }).optional(),
  photoUrl: z.string().url().nullable().optional(),
  source: z.enum(["photo", "text", "repeat", "coach", "mcp"]).default("text"),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        portion: z.string().nullable().optional(),
        grams: z.number().nullable().optional(),
        kcal: z.number().min(0),
        proteinG: z.number().min(0),
        carbsG: z.number().min(0),
        fatG: z.number().min(0),
      }),
    )
    .default([]),
  kcal: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
  fibreG: z.number().min(0).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  aiModel: z.string().nullable().optional(),
  aiRaw: z.unknown().optional(),
  notes: z.string().max(500).nullable().optional(),
  repeatOf: z.string().uuid().nullable().optional(),
});
export type SaveMeal = z.infer<typeof SaveMealSchema>;

export function slotForHour(hour: number): "breakfast" | "lunch" | "dinner" | "snack" {
  if (hour < 11) return "breakfast";
  if (hour < 15.5) return "lunch";
  if (hour >= 17) return "dinner";
  return "snack";
}
