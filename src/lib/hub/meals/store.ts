import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { mealItems, meals } from "../db/schema";
import type { Settings } from "../settings";
import { dayKey } from "../time";
import type { SaveMeal } from "./schema";

export type DayTotals = { day: string; kcal: number; proteinG: number; carbsG: number; fatG: number; meals: number };

export async function saveMeal(input: SaveMeal): Promise<{ id: string; day: string }> {
  const eatenAt = input.eatenAt ? new Date(input.eatenAt) : new Date();
  const day = dayKey(eatenAt);
  const [row] = await db
    .insert(meals)
    .values({
      eatenAt,
      day,
      slot: input.slot,
      name: input.name,
      photoUrl: input.photoUrl ?? null,
      source: input.source,
      kcal: Math.round(input.kcal),
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      fibreG: input.fibreG ?? null,
      confidence: input.confidence ?? null,
      aiModel: input.aiModel ?? null,
      aiRaw: input.aiRaw ?? null,
      notes: input.notes ?? null,
      repeatOf: input.repeatOf ?? null,
      status: "confirmed",
    })
    .returning({ id: meals.id });
  if (input.items.length) {
    await db.insert(mealItems).values(
      input.items.map((it, i) => ({
        mealId: row.id,
        name: it.name,
        portion: it.portion ?? null,
        grams: it.grams ?? null,
        kcal: Math.round(it.kcal),
        proteinG: it.proteinG,
        carbsG: it.carbsG,
        fatG: it.fatG,
        orderIndex: i,
      })),
    );
  }
  return { id: row.id, day };
}

export async function repeatMeal(id: string, eatenAt = new Date()): Promise<{ id: string; day: string }> {
  const [m] = await db.select().from(meals).where(eq(meals.id, id)).limit(1);
  if (!m) throw new Error("Meal not found");
  const items = await db.select().from(mealItems).where(eq(mealItems.mealId, id)).orderBy(mealItems.orderIndex);
  return saveMeal({
    name: m.name,
    slot: m.slot,
    eatenAt: eatenAt.toISOString(),
    photoUrl: m.photoUrl,
    source: "repeat",
    items: items.map((it) => ({ name: it.name, portion: it.portion, grams: it.grams, kcal: it.kcal, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG })),
    kcal: m.kcal,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    fibreG: m.fibreG,
    confidence: m.confidence,
    aiModel: m.aiModel,
    repeatOf: m.id,
    notes: null,
  });
}

export async function mealsForDay(day: string) {
  const rows = await db.select().from(meals).where(and(eq(meals.day, day), eq(meals.status, "confirmed"))).orderBy(meals.eatenAt);
  const ids = rows.map((r) => r.id);
  const items = ids.length ? await db.select().from(mealItems).where(inArray(mealItems.mealId, ids)).orderBy(mealItems.orderIndex) : [];
  return rows.map((m) => ({ ...m, items: items.filter((it) => it.mealId === m.id) }));
}

export async function dailyTotals(day: string): Promise<DayTotals> {
  const [t] = await db
    .select({
      kcal: sql<number>`coalesce(sum(${meals.kcal}), 0)::int`,
      proteinG: sql<number>`coalesce(sum(${meals.proteinG}), 0)::float`,
      carbsG: sql<number>`coalesce(sum(${meals.carbsG}), 0)::float`,
      fatG: sql<number>`coalesce(sum(${meals.fatG}), 0)::float`,
      meals: sql<number>`count(*)::int`,
    })
    .from(meals)
    .where(and(eq(meals.day, day), eq(meals.status, "confirmed")));
  return { day, kcal: t?.kcal ?? 0, proteinG: t?.proteinG ?? 0, carbsG: t?.carbsG ?? 0, fatG: t?.fatG ?? 0, meals: t?.meals ?? 0 };
}

export async function totalsForDays(days: string[]): Promise<DayTotals[]> {
  if (days.length === 0) return [];
  const rows = await db
    .select({
      day: meals.day,
      kcal: sql<number>`coalesce(sum(${meals.kcal}), 0)::int`,
      proteinG: sql<number>`coalesce(sum(${meals.proteinG}), 0)::float`,
      carbsG: sql<number>`coalesce(sum(${meals.carbsG}), 0)::float`,
      fatG: sql<number>`coalesce(sum(${meals.fatG}), 0)::float`,
      meals: sql<number>`count(*)::int`,
    })
    .from(meals)
    .where(and(inArray(meals.day, days), eq(meals.status, "confirmed")))
    .groupBy(meals.day);
  return days.map((d) => rows.find((r) => r.day === d) ?? { day: d, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, meals: 0 });
}

/** A consistent day: at least three meals, energy within ±10 % of target, protein ≥ 90 % of target. */
export function isConsistentDay(t: DayTotals, nutrition: Settings["nutrition"]): boolean {
  if (t.meals < 3) return false;
  if (nutrition.kcal && Math.abs(t.kcal - nutrition.kcal) > nutrition.kcal * 0.1) return false;
  if (nutrition.proteinG && t.proteinG < nutrition.proteinG * 0.9) return false;
  return true;
}

/** Recent distinct meals for one-tap repeat: most frequent in the last 30 days first. */
export async function recentMeals(limit = 20) {
  const since = dayKey(new Date(Date.now() - 30 * 86400000));
  const rows = await db
    .select({
      name: meals.name,
      count: sql<number>`count(*)::int`,
      lastId: sql<string>`(array_agg(${meals.id} order by ${meals.eatenAt} desc))[1]`,
      lastAt: sql<string>`max(${meals.eatenAt})`,
      kcal: sql<number>`round(avg(${meals.kcal}))::int`,
      photoUrl: sql<string | null>`(array_agg(${meals.photoUrl} order by ${meals.eatenAt} desc))[1]`,
    })
    .from(meals)
    .where(and(gte(meals.day, since), eq(meals.status, "confirmed")))
    .groupBy(meals.name)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${meals.eatenAt})`))
    .limit(limit);
  return rows;
}
