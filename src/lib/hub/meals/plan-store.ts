/**
 * Weekly plan storage: set meals (templates) and the entries placed on each weekday/slot.
 * Day kinds come from the planned training schedule in Settings; totals and the shopping list are derived.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { planEntries, planMeals, type MealSlot, type PlanItem } from "../db/schema";
import { getSettings } from "../settings";
import { targetsFor, type DayTargets } from "./day-targets";

export const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const PlanItemSchema = z.object({
  foodId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(160),
  portion: z.string().max(80).nullable().optional(),
  grams: z.number().nullable().optional(),
  kcal: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
});
export const SetMealSchema = z.object({
  name: z.string().min(1).max(120),
  slot: z.enum(["breakfast", "lunch", "snack", "dinner"]),
  items: z.array(PlanItemSchema).min(1).max(20),
  notes: z.string().max(300).nullable().optional(),
});
export const EntrySchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    slot: z.enum(["breakfast", "lunch", "snack", "dinner"]),
    planMealId: z.string().uuid().optional(),
    name: z.string().min(1).max(120).optional(),
    items: z.array(PlanItemSchema).min(1).max(20).optional(),
  })
  .refine((e) => e.planMealId || (e.name && e.items), { message: "planMealId or name+items" });

export type Macro = { kcal: number; proteinG: number; carbsG: number; fatG: number };
export const sumItems = (items: PlanItem[]): Macro => items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, proteinG: a.proteinG + i.proteinG, carbsG: a.carbsG + i.carbsG, fatG: a.fatG + i.fatG }), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });

export type SetMeal = { id: string; name: string; slot: MealSlot; items: PlanItem[]; notes: string | null; totals: Macro };
export type PlanEntry = { id: string; weekday: number; slot: MealSlot; position: number; planMealId: string | null; name: string; items: PlanItem[]; totals: Macro };
export type PlanDay = { weekday: number; label: string; kind: "training" | "rest"; targets: DayTargets; entries: PlanEntry[]; totals: Macro };
export type ShoppingLine = { key: string; name: string; qty: string; grams: number | null; count: number };
export type PlanData = { days: PlanDay[]; setMeals: SetMeal[]; shopping: ShoppingLine[] };

async function dayKinds(): Promise<Map<number, "training" | "rest">> {
  const { settings } = await getSettings();
  const s = settings.nutrition.trainingSchedule;
  const set = new Set<number>(s.weekdays);
  if (s.weekendFlex && !set.has(6) && !set.has(7)) set.add(6);
  const m = new Map<number, "training" | "rest">();
  for (let d = 1; d <= 7; d++) m.set(d, settings.nutrition.trainingDay && set.has(d) ? "training" : "rest");
  return m;
}

export async function listSetMeals(): Promise<SetMeal[]> {
  const rows = await db.select().from(planMeals).orderBy(asc(planMeals.slot), asc(planMeals.name));
  return rows.map((r) => ({ id: r.id, name: r.name, slot: r.slot, items: r.items, notes: r.notes, totals: sumItems(r.items) }));
}

export async function getPlan(): Promise<PlanData> {
  const { settings } = await getSettings();
  const kinds = await dayKinds();
  const [setMeals, rows] = await Promise.all([listSetMeals(), db.select().from(planEntries).orderBy(asc(planEntries.weekday), asc(planEntries.position), asc(planEntries.createdAt))]);
  const byId = new Map(setMeals.map((m) => [m.id, m]));
  const entries: PlanEntry[] = rows.flatMap((r) => {
    const sm = r.planMealId ? byId.get(r.planMealId) : undefined;
    const items = sm ? sm.items : (r.items ?? []);
    const name = sm ? sm.name : (r.name ?? "Meal");
    return [{ id: r.id, weekday: r.weekday, slot: r.slot, position: r.position, planMealId: r.planMealId ?? null, name, items, totals: sumItems(items) }];
  });
  const days: PlanDay[] = WEEKDAYS.map((label, i) => {
    const weekday = i + 1;
    const kind = kinds.get(weekday) ?? "rest";
    const dayEntries = entries.filter((e) => e.weekday === weekday);
    return { weekday, label, kind, targets: targetsFor(settings.nutrition, kind === "training"), entries: dayEntries, totals: sumItems(dayEntries.flatMap((e) => e.items)) };
  });
  return { days, setMeals, shopping: shoppingList(entries) };
}

/** Aggregate every item across the week by food (or name): total grams where known, plus how many times it appears. */
function shoppingList(entries: PlanEntry[]): ShoppingLine[] {
  const acc = new Map<string, { name: string; grams: number | null; count: number }>();
  for (const e of entries)
    for (const it of e.items) {
      const key = it.foodId ?? it.name.toLowerCase();
      const cur = acc.get(key) ?? { name: it.name.replace(/\s*\(.*\)$/, ""), grams: 0, count: 0 };
      cur.count += 1;
      cur.grams = it.grams == null || cur.grams == null ? null : cur.grams + it.grams;
      acc.set(key, cur);
    }
  return Array.from(acc.entries())
    .map(([key, v]) => ({ key, name: v.name, grams: v.grams, count: v.count, qty: v.grams != null ? (v.grams >= 1000 ? `${(v.grams / 1000).toFixed(1)} kg` : `${Math.round(v.grams)} g`) : `${v.count}×` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createSetMeal(input: z.infer<typeof SetMealSchema>): Promise<SetMeal> {
  const [r] = await db.insert(planMeals).values({ name: input.name.trim(), slot: input.slot, items: input.items as PlanItem[], notes: input.notes ?? null }).returning();
  return { id: r.id, name: r.name, slot: r.slot, items: r.items, notes: r.notes, totals: sumItems(r.items) };
}
export async function updateSetMeal(id: string, input: Partial<z.infer<typeof SetMealSchema>>): Promise<SetMeal | null> {
  const [r] = await db.update(planMeals).set({ ...(input.name ? { name: input.name.trim() } : {}), ...(input.slot ? { slot: input.slot } : {}), ...(input.items ? { items: input.items as PlanItem[] } : {}), ...(input.notes !== undefined ? { notes: input.notes } : {}), updatedAt: new Date() }).where(eq(planMeals.id, id)).returning();
  return r ? { id: r.id, name: r.name, slot: r.slot, items: r.items, notes: r.notes, totals: sumItems(r.items) } : null;
}
export async function deleteSetMeal(id: string): Promise<void> {
  await db.delete(planMeals).where(eq(planMeals.id, id));
}

export async function addEntry(input: z.infer<typeof EntrySchema>): Promise<{ id: string }> {
  const existing = await db.select({ position: planEntries.position }).from(planEntries).where(and(eq(planEntries.weekday, input.weekday), eq(planEntries.slot, input.slot)));
  const position = existing.length ? Math.max(...existing.map((e) => e.position)) + 1 : 0;
  const [r] = await db.insert(planEntries).values({ weekday: input.weekday, slot: input.slot, position, planMealId: input.planMealId ?? null, name: input.name ?? null, items: (input.items as PlanItem[] | undefined) ?? null }).returning({ id: planEntries.id });
  return r;
}
export async function removeEntry(id: string): Promise<void> {
  await db.delete(planEntries).where(eq(planEntries.id, id));
}
/** Replace a whole weekday's entries with another day's (copy day). */
export async function copyDay(from: number, to: number): Promise<void> {
  const rows = await db.select().from(planEntries).where(eq(planEntries.weekday, from));
  await db.delete(planEntries).where(eq(planEntries.weekday, to));
  if (rows.length) await db.insert(planEntries).values(rows.map((r) => ({ weekday: to, slot: r.slot, position: r.position, planMealId: r.planMealId, name: r.name, items: r.items })));
}
export async function clearDays(weekdays: number[]): Promise<void> {
  if (weekdays.length) await db.delete(planEntries).where(inArray(planEntries.weekday, weekdays));
}
