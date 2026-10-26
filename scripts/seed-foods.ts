/**
 * Food library seed. Label values come from packs Conrad photographed (Oct 2026); staples are estimates until
 * weighed/labelled. Re-running upserts by name+brand. Run: npx tsx scripts/seed-foods.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

type F = { name: string; brand?: string; basis?: "per100g" | "perUnit"; unitLabel?: string; unitGrams?: number; kcal: number; p: number; c: number; f: number; fibre?: number; qty?: number; source?: "label" | "estimate" | "website"; tags?: string[]; notes?: string };

const L = "label" as const;
const E = "estimate" as const;
const FOODS: F[] = [
  // --- Conrad's shake ---
  { name: "Protein powder", brand: "Conrad's bag", basis: "perUnit", unitLabel: "scoop", unitGrams: 30, kcal: 110, p: 24.3, c: 0.7, f: 1.9, fibre: 1.6, qty: 2, source: L, tags: ["shake", "protein"], notes: "Label: 366 kcal, 81 g protein per 100 g." },
  { name: "Collagen Booster", basis: "perUnit", unitLabel: "scoop", unitGrams: 10, kcal: 36, p: 0, c: 0, f: 0, qty: 1, source: L, tags: ["shake", "supplement"], notes: "9.96 g collagen peptides per scoop; not counted as protein (incomplete)." },
  { name: "Creatine monohydrate", basis: "perUnit", unitLabel: "scoop", unitGrams: 5, kcal: 0, p: 0, c: 0, f: 0, qty: 1, source: L, tags: ["shake", "supplement"] },
  { name: "Frozen mixed berries", kcal: 45, p: 1, c: 8, f: 0.3, fibre: 3, qty: 350, source: E, tags: ["shake", "fruit"] },
  { name: "Gluten-free oats", kcal: 375, p: 12.5, c: 62, f: 7.5, fibre: 10, qty: 40, source: E, tags: ["shake", "carbs"] },
  { name: "Sport-Mix nuts", brand: "Alesto (Lidl)", kcal: 630, p: 22.9, c: 11.2, f: 53.1, fibre: 7.8, qty: 30, source: L, tags: ["shake", "nuts", "snack"], notes: "Cashews, peanuts, walnuts, almonds, hazelnuts. 150 g bag = 5 × 30 g." },
  // --- meat & protein ---
  { name: "Chicken breast fillets, raw", brand: "Lidl free range", basis: "perUnit", unitLabel: "breast", unitGrams: 151, kcal: 160, p: 36.2, c: 0, f: 1.7, qty: 1.5, source: L, tags: ["meat", "protein"], notes: "454 g pack of 3; one breast ≈ 151 g. Label per 100 g: 106 kcal, 24 g protein, 1.1 g fat." },
  { name: "Rib eye steak, raw", brand: "Deluxe Irish Angus (Lidl)", basis: "perUnit", unitLabel: "steak", unitGrams: 227, kcal: 456, p: 49, c: 0, f: 28.8, qty: 1, source: L, tags: ["meat", "red meat"], notes: "454 g pack of 2; half a steak is a sensible portion on a fat-capped day. Label per 100 g: 201 kcal, 21.6 g protein, 12.7 g fat." },
  { name: "Turkey burgers", brand: "Lidl", basis: "perUnit", unitLabel: "burger", unitGrams: 100, kcal: 105, p: 19, c: 3.5, f: 1.4, qty: 2, source: L, tags: ["meat", "protein"], notes: "Contains wheat rusk (gluten)." },
  { name: "Turkey mince 5%, raw", kcal: 120, p: 22, c: 0, f: 3, qty: 200, source: E, tags: ["meat", "protein"] },
  { name: "Mini pepper", basis: "perUnit", unitLabel: "pepper", unitGrams: 37, kcal: 9, p: 0.3, c: 1.4, f: 0.1, qty: 4, source: E, tags: ["veg"], notes: "Snack peppers by the piece; ~37 g each." },
  { name: "Spring onion", basis: "perUnit", unitLabel: "spring onion", unitGrams: 18, kcal: 6, p: 0.3, c: 1.3, f: 0, qty: 2, source: E, tags: ["veg"] },
  { name: "Back bacon, fried, fat trimmed", kcal: 200, p: 26, c: 0, f: 10, qty: 100, source: E, tags: ["meat"], notes: "Per 100 g cooked; 4 rashers ≈ 100 g." },
  { name: "Sliced chicken or turkey", kcal: 110, p: 22, c: 1, f: 2, qty: 100, source: E, tags: ["meat", "snack"] },
  // --- ready meals ---
  { name: "Japanese Style Chicken Curry & Rice", brand: "Myprotein", basis: "perUnit", unitLabel: "pack", unitGrams: 312, kcal: 321, p: 32.1, c: 29.4, f: 7.5, fibre: 3.7, qty: 1, source: L, tags: ["ready meal", "lunch"], notes: "325 g pack, 312 g microwaved. No gluten, dairy, egg or fish listed." },
  { name: "Firecracker Chicken & Rice", brand: "Myprotein", basis: "perUnit", unitLabel: "pack", unitGrams: 315, kcal: 295, p: 30, c: 32.9, f: 4.2, fibre: 3.6, qty: 1, source: L, tags: ["ready meal", "lunch"], notes: "325 g pack. Coconut aminos, no gluten/dairy/egg/fish." },
  { name: "Thai Red Chicken with Brown Rice", brand: "Fit Foods", basis: "perUnit", unitLabel: "pack", unitGrams: 400, kcal: 488, p: 36, c: 44.3, f: 17.6, fibre: 4.4, qty: 1, source: L, tags: ["ready meal", "lunch"], notes: "Contains shrimp paste (crustaceans); may contain traces of fish." },
  { name: "Jamaican Jerk Chicken", brand: "Chef Select (Lidl)", basis: "perUnit", unitLabel: "pack", unitGrams: 400, kcal: 437, p: 39.6, c: 49.2, f: 7.6, fibre: 6.8, qty: 1, source: L, tags: ["ready meal", "lunch"], notes: "Celery; may contain nuts. No gluten, dairy, egg or fish listed." },
  { name: "Chicken & Chorizo Paella", brand: "Chef Select (Lidl)", basis: "perUnit", unitLabel: "pack", unitGrams: 400, kcal: 379, p: 28.8, c: 48.8, f: 6.4, fibre: 5.6, qty: 1, source: L, tags: ["ready meal", "lunch"], notes: "Chorizo cultures contain milk (dairy)." },
  // --- carbs ---
  { name: "Potato Waffle Fries, oven baked", brand: "Birds Eye", kcal: 175, p: 1.5, c: 27, f: 6.2, fibre: 2, qty: 185, source: L, tags: ["carbs", "frozen"], notes: "500 g bag, as sold per 100 g. Gluten-free, vegan." },
  { name: "Original Potato Waffle, oven baked", brand: "Birds Eye", basis: "perUnit", unitLabel: "waffle", unitGrams: 58, kcal: 98, p: 1.25, c: 13, f: 4.4, fibre: 0.8, qty: 2, source: L, tags: ["carbs", "frozen"], notes: "Per 2 waffles 196 kcal. Weight per waffle estimated." },
  { name: "Potato Wedges, lightly spiced, oven cooked", brand: "Harvest Basket (Lidl)", kcal: 134, p: 2.6, c: 20.5, f: 3.9, fibre: 3, qty: 150, source: L, tags: ["carbs", "frozen"], notes: "1 kg bag. Rice/maize coating, no gluten listed." },
  { name: "Hash brown, oven baked", basis: "perUnit", unitLabel: "hash brown", unitGrams: 45, kcal: 78, p: 1.2, c: 10, f: 3.6, qty: 1, source: L, tags: ["carbs", "frozen"] },
  { name: "Lime & Coriander microwave rice", brand: "Lidl", kcal: 153, p: 3.5, c: 28.3, f: 2.4, fibre: 2, qty: 125, source: L, tags: ["carbs", "rice"], notes: "250 g pouch = 2 servings. Vegan." },
  { name: "Rice, white, dry", kcal: 351, p: 7, c: 78, f: 1, qty: 100, source: E, tags: ["carbs", "rice"], notes: "Weigh dry." },
  { name: "Potatoes, raw", kcal: 77, p: 2, c: 17, f: 0.1, fibre: 2, qty: 300, source: E, tags: ["carbs"] },
  { name: "Gluten-free pasta, dry", kcal: 350, p: 7, c: 76, f: 1, qty: 80, source: E, tags: ["carbs"] },
  { name: "Kidney beans, drained", kcal: 100, p: 7, c: 17, f: 0.5, fibre: 6, qty: 120, source: E, tags: ["carbs", "beans"] },
  // --- veg ---
  { name: "Mixed peppers, raw", brand: "Lidl", kcal: 24, p: 0.8, c: 3.8, f: 0.2, fibre: 2, qty: 150, source: L, tags: ["veg"], notes: "Half a pepper ≈ 80 g." },
  { name: "Snack peppers, raw", kcal: 24, p: 0.8, c: 3.8, f: 0.2, fibre: 2, qty: 100, source: E, tags: ["veg"], notes: "Same as mixed peppers; 4 mini peppers ≈ 150 g." },
  { name: "Broccoli, raw", kcal: 34, p: 2.8, c: 7, f: 0.4, fibre: 2.6, qty: 150, source: E, tags: ["veg"] },
  { name: "Spring onions", kcal: 32, p: 1.8, c: 7, f: 0.2, fibre: 2.6, qty: 40, source: E, tags: ["veg"], notes: "One spring onion ≈ 15–20 g." },
  { name: "Avocado", kcal: 160, p: 2, c: 9, f: 15, fibre: 7, qty: 150, source: E, tags: ["veg", "fat"], notes: "Whole avocado flesh ≈ 150 g." },
  { name: "Sauerkraut", kcal: 19, p: 0.9, c: 4, f: 0.1, fibre: 3, qty: 50, source: E, tags: ["veg", "fermented", "gut"] },
  // --- fats & condiments ---
  { name: "Olive oil", kcal: 884, p: 0, c: 0, f: 100, qty: 5, source: E, tags: ["fat", "oil"], notes: "1 tsp = 5 g, 1 tbsp = 15 g." },
  { name: "Peanut Rayu, extra hot crispy chilli oil", brand: "White Mausu", kcal: 701, p: 9.7, c: 6.9, f: 70.9, fibre: 2.1, qty: 15, source: L, tags: ["condiment", "oil"], notes: "Tamari, no wheat listed. Vegan." },
  { name: "Smoky chilli oil No. 05", brand: "White Mausu", kcal: 757, p: 0.7, c: 6.2, f: 81, qty: 15, source: L, tags: ["condiment", "oil"], notes: "Tamari soy sauce; wheat not stated. Vegan." },
  { name: "Honey", brand: "Tesco", kcal: 331, p: 0.3, c: 82.4, f: 0, qty: 20, source: L, tags: ["condiment", "sugar"] },
  // --- snacks, fruit, drinks ---
  { name: "Plant Protein Red Berries", brand: "Alpro", basis: "perUnit", unitLabel: "pot", unitGrams: 200, kcal: 164, p: 15, c: 14, f: 4.6, fibre: 2.2, qty: 1, source: L, tags: ["snack", "protein", "dairy-free"], notes: "Per 100 g: 82 kcal, 7.5 g protein; pot size inferred from 15 g protein per pack. Soya, vegan." },
  { name: "Dairy Milk chocolate", brand: "Cadbury", basis: "perUnit", unitLabel: "square", unitGrams: 6, kcal: 32, p: 0.4, c: 3.4, f: 1.8, qty: 5, source: E, tags: ["snack", "sweet"], notes: "Dairy." },
  { name: "Banana", basis: "perUnit", unitLabel: "banana", unitGrams: 120, kcal: 105, p: 1.3, c: 27, f: 0.4, fibre: 3, qty: 1, source: E, tags: ["fruit"] },
  { name: "Apple", basis: "perUnit", unitLabel: "apple", unitGrams: 180, kcal: 80, p: 0.4, c: 21, f: 0.3, fibre: 4, qty: 1, source: E, tags: ["fruit"] },
  { name: "Medjool date", basis: "perUnit", unitLabel: "date", unitGrams: 24, kcal: 66, p: 0.4, c: 18, f: 0, fibre: 1.6, qty: 2, source: E, tags: ["fruit", "sweet"] },
  { name: "Coke Zero", basis: "perUnit", unitLabel: "can", unitGrams: 330, kcal: 1, p: 0, c: 0, f: 0, qty: 1, source: L, tags: ["drink"] },
];

async function main() {
  const { db } = await import("../src/lib/hub/db/client");
  const { foods } = await import("../src/lib/hub/db/schema");
  const { and, eq, isNull } = await import("drizzle-orm");
  let created = 0, updated = 0;
  for (const f of FOODS) {
    const basis = f.basis ?? "per100g";
    const values = { name: f.name, brand: f.brand ?? null, basis, unitLabel: basis === "perUnit" ? (f.unitLabel ?? "unit") : null, unitGrams: f.unitGrams ?? null, kcal: f.kcal, proteinG: f.p, carbsG: f.c, fatG: f.f, fibreG: f.fibre ?? null, defaultQty: f.qty ?? (basis === "perUnit" ? 1 : 100), source: f.source ?? "estimate", tags: f.tags ?? null, notes: f.notes ?? null, updatedAt: new Date() };
    const where = f.brand ? and(eq(foods.name, f.name), eq(foods.brand, f.brand)) : and(eq(foods.name, f.name), isNull(foods.brand));
    const [existing] = await db.select({ id: foods.id }).from(foods).where(where).limit(1);
    if (existing) { await db.update(foods).set(values).where(eq(foods.id, existing.id)); updated++; }
    else { await db.insert(foods).values(values); created++; }
  }
  console.log(`foods: ${created} created, ${updated} updated, ${FOODS.length} total`);
}
main().catch((e) => { console.error(e); process.exit(1); });
