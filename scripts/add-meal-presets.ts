/**
 * Saved meal presets (status 'preset'): they appear in the Repeat rail but never count as eaten.
 * Derived from the weekly plan in src/lib/hub/meals/plan.ts — one source of truth. Re-running replaces all presets.
 * Run: npx tsx scripts/add-meal-presets.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { WEEK, mealTotal } = await import("../src/lib/hub/meals/plan");
  const { db } = await import("../src/lib/hub/db/client");
  const { meals, mealItems } = await import("../src/lib/hub/db/schema");
  const { eq } = await import("drizzle-orm");
  const { dayKey } = await import("../src/lib/hub/time");

  const slotMap = { Breakfast: "breakfast", Lunch: "lunch", Snack: "snack", Dinner: "dinner", Fruit: "snack" } as const;
  const unique = new Map<string, (typeof WEEK)[number]["meals"][number]>();
  for (const d of WEEK) for (const m of d.meals) if (m.slot !== "Fruit" && !unique.has(m.name)) unique.set(m.name, m);

  await db.delete(meals).where(eq(meals.status, "preset"));
  for (const m of unique.values()) {
    const t = mealTotal(m);
    const [row] = await db
      .insert(meals)
      .values({ eatenAt: new Date(), day: dayKey(), slot: slotMap[m.slot], name: m.name, source: "text", status: "preset", notes: m.note ?? null, confidence: 0.5, kcal: Math.round(t.kcal), proteinG: t.p, carbsG: t.c, fatG: t.f })
      .returning({ id: meals.id });
    await db.insert(mealItems).values(m.items.map((it, i) => ({ mealId: row.id, name: it.name, portion: it.portion, grams: null, kcal: Math.round(it.kcal), proteinG: it.p, carbsG: it.c, fatG: it.f, orderIndex: i })));
    console.log(`preset "${m.name}": ${Math.round(t.kcal)} kcal, P${Math.round(t.p)} C${Math.round(t.c)} F${Math.round(t.f)}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
