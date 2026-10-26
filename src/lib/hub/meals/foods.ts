/** Food library: search, create, update, and turn a food + quantity into a meal item. */
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { foods, type FoodBasis, type FoodSource } from "../db/schema";

export const FoodInputSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().max(80).nullable().optional(),
  basis: z.enum(["per100g", "perUnit"]).default("per100g"),
  unitLabel: z.string().max(40).nullable().optional(),
  unitGrams: z.number().positive().nullable().optional(),
  kcal: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
  fibreG: z.number().min(0).nullable().optional(),
  defaultQty: z.number().positive().nullable().optional(),
  source: z.enum(["label", "estimate", "website"]).default("estimate"),
  tags: z.array(z.string().max(30)).max(10).nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
});
export type FoodInput = z.infer<typeof FoodInputSchema>;
export type Food = typeof foods.$inferSelect;

export async function searchFoods(q: string, limit = 30): Promise<Food[]> {
  const term = q.trim();
  const base = db.select().from(foods);
  const rows = term
    ? await base.where(or(ilike(foods.name, `%${term}%`), ilike(foods.brand, `%${term}%`), sql`${foods.tags}::text ilike ${"%" + term + "%"}`)).orderBy(desc(foods.useCount), foods.name).limit(limit)
    : await base.orderBy(desc(foods.useCount), desc(foods.lastUsedAt), foods.name).limit(limit);
  return rows;
}

export async function createFood(input: FoodInput): Promise<Food> {
  const [row] = await db
    .insert(foods)
    .values({
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      basis: input.basis as FoodBasis,
      unitLabel: input.unitLabel?.trim() || null,
      unitGrams: input.unitGrams ?? null,
      kcal: input.kcal,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      fibreG: input.fibreG ?? null,
      defaultQty: input.defaultQty ?? (input.basis === "perUnit" ? 1 : 100),
      source: input.source as FoodSource,
      tags: input.tags ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateFood(id: string, patch: Partial<FoodInput>): Promise<Food | null> {
  const [row] = await db
    .update(foods)
    .set({ ...patch, brand: patch.brand === undefined ? undefined : patch.brand?.trim() || null, updatedAt: new Date() })
    .where(eq(foods.id, id))
    .returning();
  return row ?? null;
}

export async function deleteFood(id: string): Promise<void> {
  await db.delete(foods).where(eq(foods.id, id));
}

export async function markFoodsUsed(ids: string[]): Promise<void> {
  for (const id of new Set(ids)) {
    await db.update(foods).set({ useCount: sql`${foods.useCount} + 1`, lastUsedAt: new Date() }).where(eq(foods.id, id));
  }
}

export type FoodQty = { food: Pick<Food, "name" | "brand" | "basis" | "unitLabel" | "unitGrams" | "kcal" | "proteinG" | "carbsG" | "fatG">; qty: number };

/** A food at a quantity (grams for per100g, units for perUnit) → a meal item with portion text and macros. */
export function foodToItem({ food, qty }: FoodQty) {
  const factor = food.basis === "perUnit" ? qty : qty / 100;
  const grams = food.basis === "perUnit" ? (food.unitGrams ? food.unitGrams * qty : null) : qty;
  const unit = food.unitLabel ?? "unit";
  const portion = food.basis === "perUnit" ? `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${unit}${qty === 1 ? "" : "s"}${grams ? ` · ${Math.round(grams)} g` : ""}` : `${Math.round(qty)} g`;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    portion,
    grams,
    kcal: Math.round(food.kcal * factor),
    proteinG: r1(food.proteinG * factor),
    carbsG: r1(food.carbsG * factor),
    fatG: r1(food.fatG * factor),
  };
}
