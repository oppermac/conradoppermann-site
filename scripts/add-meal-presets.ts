/**
 * Saved meal presets (status 'preset'): they appear in the Repeat rail but never count as eaten.
 * Placeholder macros until Conrad weighs ingredients. Re-running replaces presets by name.
 * Run: npx tsx scripts/add-meal-presets.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

type Item = { name: string; portion: string; grams: number | null; kcal: number; proteinG: number; carbsG: number; fatG: number };
type Preset = { name: string; slot: "breakfast" | "lunch" | "dinner" | "snack"; notes: string; items: Item[] };

const PRESETS: Preset[] = [
  {
    name: "Breakfast protein smoothie",
    slot: "breakfast",
    notes: "placeholder — assumes water as the liquid; protein powder taken as ~80% protein",
    items: [
      { name: "Frozen fruit and berries", portion: "350 ml (~300 g)", grams: 300, kcal: 160, proteinG: 2, carbsG: 35, fatG: 1 },
      { name: "Protein powder", portion: "50 g", grams: 50, kcal: 195, proteinG: 40, carbsG: 3, fatG: 3 },
      { name: "Creatine", portion: "5 g", grams: 5, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      { name: "Collagen", portion: "5 g", grams: 5, kcal: 18, proteinG: 4.5, carbsG: 0, fatG: 0 },
    ],
  },
];

async function main() {
  const { db } = await import("../src/lib/hub/db/client");
  const { meals, mealItems } = await import("../src/lib/hub/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const { dayKey } = await import("../src/lib/hub/time");
  for (const p of PRESETS) {
    await db.delete(meals).where(and(eq(meals.name, p.name), eq(meals.status, "preset")));
    const totals = p.items.reduce((a, it) => ({ kcal: a.kcal + it.kcal, proteinG: a.proteinG + it.proteinG, carbsG: a.carbsG + it.carbsG, fatG: a.fatG + it.fatG }), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    const [row] = await db
      .insert(meals)
      .values({ eatenAt: new Date(), day: dayKey(), slot: p.slot, name: p.name, source: "text", status: "preset", notes: p.notes, confidence: 0.5, ...totals, kcal: Math.round(totals.kcal) })
      .returning({ id: meals.id });
    await db.insert(mealItems).values(p.items.map((it, i) => ({ mealId: row.id, name: it.name, portion: it.portion, grams: it.grams, kcal: Math.round(it.kcal), proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG, orderIndex: i })));
    console.log(`preset "${p.name}": ${Math.round(totals.kcal)} kcal, P${totals.proteinG} C${totals.carbsG} F${totals.fatG}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
