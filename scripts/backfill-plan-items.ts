/** One-off: give existing plan items their qty/basis/base from the food library so rows can be re-sized. */
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { db } = await import("../src/lib/hub/db/client");
  const { foods, planMeals, planEntries } = await import("../src/lib/hub/db/schema");
  const { eq } = await import("drizzle-orm");
  const lib = await db.select().from(foods);
  const byId = new Map(lib.map((f) => [f.id, f]));
  const fill = (items: any[]) => items.map((it) => {
    if (it.base) return it;
    const f = it.foodId ? byId.get(it.foodId) : lib.find((x) => (x.brand ? `${x.name} (${x.brand})` : x.name) === it.name);
    if (f) {
      const qty = f.basis === "perUnit" ? (f.unitGrams && it.grams ? Math.round((it.grams / f.unitGrams) * 2) / 2 : (f.kcal ? Math.round((it.kcal / f.kcal) * 2) / 2 : 1)) : (it.grams ?? (f.kcal ? Math.round((it.kcal / f.kcal) * 100) : 100));
      return { ...it, foodId: f.id, qty, basis: f.basis, unitLabel: f.unitLabel, unitGrams: f.unitGrams, base: { kcal: f.kcal, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG } };
    }
    if (/olive oil, for frying/i.test(it.name)) return { ...it, qty: 1, basis: "perUnit", unitLabel: "tsp", unitGrams: 5, base: { kcal: 44, proteinG: 0, carbsG: 0, fatG: 5 } };
    return it;
  });
  let n = 0;
  for (const m of await db.select().from(planMeals)) { await db.update(planMeals).set({ items: fill(m.items) }).where(eq(planMeals.id, m.id)); n++; }
  let e = 0;
  for (const r of await db.select().from(planEntries)) { if (r.items) { await db.update(planEntries).set({ items: fill(r.items) }).where(eq(planEntries.id, r.id)); e++; } }
  console.log(`backfilled ${n} set meals, ${e} custom entries`);
}
main().catch((err) => { console.error(err); process.exit(1); });
