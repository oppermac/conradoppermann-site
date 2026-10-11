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
  // Label numbers (11 Oct 2026): protein 110 kcal / 24.3 P / 0.7 C / 1.9 F per 30 g scoop; collagen counted as 0 g protein (no tryptophan, low leucine) though it is ~36 kcal; creatine 0.
  // Berries, oats and nuts are estimates until weighed. Liquid assumed water.
  {
    name: "Shake · training day",
    slot: "breakfast",
    notes: "800 ml. No nuts on training days (low-fat meal 1), extra oats for carbs.",
    items: [
      { name: "Protein powder", portion: "2 scoops (60 g)", grams: 60, kcal: 220, proteinG: 48.6, carbsG: 1.4, fatG: 3.8 },
      { name: "Collagen (incomplete protein, not counted)", portion: "1 scoop (10 g)", grams: 10, kcal: 36, proteinG: 0, carbsG: 0, fatG: 0 },
      { name: "Creatine", portion: "1 scoop (5 g)", grams: 5, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      { name: "Frozen mixed berries", portion: "350 g", grams: 350, kcal: 158, proteinG: 3, carbsG: 28, fatG: 1 },
      { name: "Gluten-free oats", portion: "big handful (60 g)", grams: 60, kcal: 225, proteinG: 7.5, carbsG: 38, fatG: 4.5 },
    ],
  },
  {
    name: "Shake · rest day",
    slot: "breakfast",
    notes: "800 ml. Handful of nuts and seeds on rest days.",
    items: [
      { name: "Protein powder", portion: "2 scoops (60 g)", grams: 60, kcal: 220, proteinG: 48.6, carbsG: 1.4, fatG: 3.8 },
      { name: "Collagen (incomplete protein, not counted)", portion: "1 scoop (10 g)", grams: 10, kcal: 36, proteinG: 0, carbsG: 0, fatG: 0 },
      { name: "Creatine", portion: "1 scoop (5 g)", grams: 5, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      { name: "Frozen mixed berries", portion: "350 g", grams: 350, kcal: 158, proteinG: 3, carbsG: 28, fatG: 1 },
      { name: "Gluten-free oats", portion: "handful (40 g)", grams: 40, kcal: 150, proteinG: 5, carbsG: 25, fatG: 3 },
      { name: "Nuts and seeds", portion: "handful (30 g)", grams: 30, kcal: 180, proteinG: 6, carbsG: 5, fatG: 15 },
    ],
  },
  {
    name: "Skyr + banana + honey",
    slot: "snack",
    notes: "Training-day snack around the gym.",
    items: [
      { name: "0% skyr / Greek yoghurt", portion: "250 g", grams: 250, kcal: 150, proteinG: 26, carbsG: 10, fatG: 0 },
      { name: "Banana", portion: "1 medium", grams: 120, kcal: 105, proteinG: 1, carbsG: 27, fatG: 0 },
      { name: "Honey", portion: "1 tbsp (20 g)", grams: 20, kcal: 60, proteinG: 0, carbsG: 16, fatG: 0 },
    ],
  },
  {
    name: "Skyr + apple",
    slot: "snack",
    notes: "Rest-day snack.",
    items: [
      { name: "0% skyr / Greek yoghurt", portion: "250 g", grams: 250, kcal: 150, proteinG: 26, carbsG: 10, fatG: 0 },
      { name: "Apple", portion: "1 medium", grams: 180, kcal: 80, proteinG: 0, carbsG: 20, fatG: 0 },
    ],
  },
  {
    name: "Steak, potatoes and greens",
    slot: "dinner",
    notes: "Training-day dinner. 200 g lean steak or chicken, 400 g potato, 200 g greens, 1 tsp oil.",
    items: [
      { name: "Lean steak (sirloin, trimmed) or chicken breast", portion: "200 g raw", grams: 200, kcal: 330, proteinG: 46, carbsG: 0, fatG: 15 },
      { name: "Potato", portion: "400 g", grams: 400, kcal: 310, proteinG: 8, carbsG: 68, fatG: 0 },
      { name: "Greens (broccoli / green beans / spinach)", portion: "200 g", grams: 200, kcal: 60, proteinG: 5, carbsG: 8, fatG: 0 },
      { name: "Olive oil", portion: "1 tsp", grams: 5, kcal: 45, proteinG: 0, carbsG: 0, fatG: 5 },
    ],
  },
  {
    name: "Salmon, potatoes and veg",
    slot: "dinner",
    notes: "Rest-day dinner. Swap salmon for steak + 10 g butter if preferred.",
    items: [
      { name: "Salmon fillet", portion: "180 g raw", grams: 180, kcal: 360, proteinG: 38, carbsG: 0, fatG: 23 },
      { name: "Potato", portion: "250 g", grams: 250, kcal: 195, proteinG: 5, carbsG: 43, fatG: 0 },
      { name: "Veg", portion: "200 g", grams: 200, kcal: 60, proteinG: 5, carbsG: 8, fatG: 0 },
      { name: "Butter", portion: "10 g", grams: 10, kcal: 75, proteinG: 0, carbsG: 0, fatG: 8 },
    ],
  },
];

async function main() {
  const { db } = await import("../src/lib/hub/db/client");
  const { meals, mealItems } = await import("../src/lib/hub/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const { dayKey } = await import("../src/lib/hub/time");
  await db.delete(meals).where(eq(meals.status, "preset"));
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
