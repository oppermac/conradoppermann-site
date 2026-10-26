/**
 * One-off: move the hard-coded weekly plan (src/lib/hub/meals/plan.ts) into the plan tables so it can be edited in
 * the hub. Set meals are created per unique meal name; entries reference them. Links items to library foods by name.
 * Run: npx tsx scripts/seed-plan.ts   (wipes existing plan rows)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { WEEK } = await import("../src/lib/hub/meals/plan");
  const { db } = await import("../src/lib/hub/db/client");
  const { planMeals, planEntries, foods } = await import("../src/lib/hub/db/schema");
  const lib = await db.select({ id: foods.id, name: foods.name }).from(foods);
  const foodId = (name: string) => lib.find((f) => f.name.toLowerCase() === name.toLowerCase() || name.toLowerCase().startsWith(f.name.toLowerCase().split(",")[0]))?.id ?? null;
  const slotOf = (s: string) => (s === "Fruit" ? "snack" : s.toLowerCase()) as "breakfast" | "lunch" | "snack" | "dinner";

  await db.delete(planEntries);
  await db.delete(planMeals);
  const ids = new Map<string, string>();
  for (const day of WEEK) {
    for (const m of day.meals) {
      if (!ids.has(m.name)) {
        const items = m.items.map((it) => ({ foodId: foodId(it.name), name: it.name, portion: it.portion || null, grams: null, kcal: it.kcal, proteinG: it.p, carbsG: it.c, fatG: it.f }));
        const [row] = await db.insert(planMeals).values({ name: m.name, slot: slotOf(m.slot), items, notes: m.note ?? null }).returning({ id: planMeals.id });
        ids.set(m.name, row.id);
      }
    }
  }
  let n = 0;
  for (const [i, day] of WEEK.entries()) {
    for (const [pos, m] of day.meals.entries()) {
      await db.insert(planEntries).values({ weekday: i + 1, slot: slotOf(m.slot), position: pos, planMealId: ids.get(m.name)! });
      n++;
    }
  }
  console.log(`set meals: ${ids.size}, entries: ${n}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
