/**
 * (Legacy) the October 2026 starter plan. /hub/plan is now built by Conrad in the hub (plan_meals + plan_entries);
 * this file only feeds scripts/add-meal-presets.ts and scripts/seed-plan.ts (optional import).
 * Conrad's weekly food plan — Darragh's targets (200 g protein, carb cycling).
 * Constraints: no gluten, dairy, eggs or fish; burrito places = bowls only; training Tue/Thu/Sat.
 * Macros are label numbers for the powders and reasonable estimates for everything else (see notes).
 */

export type Macro = { kcal: number; p: number; c: number; f: number };
export type PlanItem = Macro & { name: string; portion: string };
export type PlanMeal = { slot: "Breakfast" | "Lunch" | "Snack" | "Dinner" | "Fruit"; name: string; note?: string; items: PlanItem[] };
export type PlanDay = { day: string; short: string; kind: "training" | "rest"; meals: PlanMeal[] };

export const TARGETS: Record<PlanDay["kind"], Macro> = {
  training: { kcal: 2802, p: 200, c: 388, f: 50 },
  rest: { kcal: 2664, p: 200, c: 286, f: 80 },
};

const it = (name: string, portion: string, kcal: number, p: number, c: number, f: number): PlanItem => ({ name, portion, kcal, p, c, f });

// ---- building blocks -------------------------------------------------------------------------

const POWDER = it("Protein powder", "2 scoops · 60 g", 220, 48.6, 1.4, 3.8);
const COLLAGEN = it("Collagen", "1 scoop · 10 g (not counted as protein)", 36, 0, 0, 0);
const CREATINE = it("Creatine", "1 scoop · 5 g", 0, 0, 0, 0);
const BERRIES = it("Frozen mixed berries", "350 g", 158, 3, 28, 1);

const SHAKE: PlanMeal = {
  slot: "Breakfast",
  name: "Shake",
  note: "800 ml with water. The same every day.",
  items: [POWDER, COLLAGEN, CREATINE, BERRIES, it("Gluten-free oats", "handful · 40 g", 150, 5, 25, 3), it("Nuts and seeds", "handful · 30 g", 180, 6, 5, 15)],
};

const BOWL_TRAINING: PlanMeal = {
  slot: "Lunch",
  name: "Burrito bowl · training",
  note: "Double rice, single chicken, black beans, salsa, corn. No guac, cheese or sour cream.",
  items: [
    it("Rice", "double", 400, 8, 88, 2),
    it("Chicken", "single · ~110 g cooked", 175, 32, 0, 4),
    it("Black beans", "regular", 120, 7, 20, 1),
    it("Salsa and corn", "", 80, 2, 17, 1),
  ],
};

const BOWL_REST: PlanMeal = {
  slot: "Lunch",
  name: "Burrito bowl · rest",
  note: "Single rice, double chicken, black beans, guac, salsa. No cheese or sour cream.",
  items: [
    it("Rice", "single", 200, 4, 44, 1),
    it("Chicken", "double · ~220 g cooked", 350, 65, 0, 8),
    it("Black beans", "regular", 120, 7, 20, 1),
    it("Guacamole", "regular", 150, 2, 8, 14),
    it("Salsa", "", 20, 0, 4, 0),
  ],
};

const SNACK_TRAINING: PlanMeal = {
  slot: "Snack",
  name: "Gym snack",
  note: "Before or after training. Swap the scoop for 100 g sliced chicken or turkey if you prefer food.",
  items: [it("Protein powder in water", "1 scoop · 30 g", 110, 24.3, 0.7, 1.9), it("Banana", "1", 105, 1, 27, 0), it("Medjool dates", "2", 130, 1, 36, 0)],
};

const SNACK_REST: PlanMeal = {
  slot: "Snack",
  name: "Afternoon snack",
  note: "Swap the scoop for 100 g sliced chicken or turkey, or a dairy-free protein bar.",
  items: [it("Protein powder in water", "1 scoop · 30 g", 110, 24.3, 0.7, 1.9), it("Apple", "1", 80, 0, 20, 0), it("Rice cakes", "2", 70, 1, 15, 0)],
};

const FRUIT_REST: PlanMeal = { slot: "Fruit", name: "Fruit", items: [it("Banana", "1", 105, 1, 27, 0)] };

const VEG = it("Veg, 300 g raw: e.g. 150 g broccoli + 100 g snack peppers + 50 g carrot", "", 100, 5, 20, 1);
const FERMENT = it("Sauerkraut or vegan kimchi", "50 g, from the fridge, unpasteurised", 10, 0.5, 2, 0);

// Training-day dinners: lean protein, big carb, little fat.
const DINNER_STEAK_TRAINING: PlanMeal = {
  slot: "Dinner",
  name: "Steak, potatoes, greens",
  items: [it("Sirloin steak, trimmed", "200 g raw", 330, 46, 0, 15), it("Potatoes", "500 g", 388, 10, 85, 0), VEG, FERMENT],
};
const DINNER_CHICKEN_RICE: PlanMeal = {
  slot: "Dinner",
  name: "Chicken stir-fry with rice",
  note: "Tamari (gluten-free soy), garlic, ginger, chilli.",
  items: [it("Chicken breast", "220 g raw", 240, 50, 0, 5), it("Rice", "125 g dry", 450, 9, 98, 1), it("Stir-fry veg: peppers, broccoli, carrot, onion", "300 g", 100, 5, 20, 1), FERMENT, it("Sesame or olive oil", "1 tsp", 45, 0, 0, 5)],
};
const DINNER_TURKEY_CHILLI: PlanMeal = {
  slot: "Dinner",
  name: "Turkey chilli with rice",
  note: "Make double on Saturday: it is Monday's lunch fallback.",
  items: [it("Turkey mince 5%", "200 g raw", 240, 44, 0, 6), it("Kidney beans", "120 g drained", 120, 8, 20, 1), it("Tomatoes, onion, pepper", "300 g", 100, 4, 20, 0), it("Rice", "100 g dry", 360, 7, 78, 1), FERMENT],
};

// Rest-day dinners: same shape, fat from the meat, oil or avocado.
const DINNER_THIGHS_ROAST: PlanMeal = {
  slot: "Dinner",
  name: "Roast chicken thighs and potatoes",
  items: [it("Chicken thighs, skin off", "220 g raw", 260, 42, 0, 10), it("Potatoes, roasted", "400 g", 310, 8, 68, 0), it("Olive oil", "1 tbsp", 120, 0, 0, 14), VEG, FERMENT],
};
const DINNER_TURKEY_RAGU: PlanMeal = {
  slot: "Dinner",
  name: "Turkey ragù with gluten-free pasta",
  note: "Onion, garlic, grated carrot and courgette in the sauce — hidden plants.",
  items: [it("Turkey mince 5%", "200 g raw", 240, 44, 0, 6), it("Tomato sauce with onion, garlic, carrot, courgette", "300 g", 100, 4, 20, 0), it("Gluten-free pasta", "80 g dry", 280, 6, 61, 1), it("Olive oil", "1 tbsp", 120, 0, 0, 14), FERMENT],
};
const DINNER_STEAK_AVOCADO: PlanMeal = {
  slot: "Dinner",
  name: "Steak, avocado, potatoes, greens",
  items: [it("Sirloin steak, trimmed", "200 g raw", 330, 46, 0, 15), it("Avocado", "half", 120, 1, 2, 11), it("Potatoes", "300 g", 234, 6, 51, 0), VEG, FERMENT],
};
const DINNER_STEAK_ROAST_VEG: PlanMeal = {
  slot: "Dinner",
  name: "Steak with roast veg and potatoes",
  note: "Sunday: tray of peppers, carrots, red onion and broccoli roasted in the oil.",
  items: [it("Sirloin steak, trimmed", "200 g raw", 330, 46, 0, 15), it("Potatoes", "300 g", 234, 6, 51, 0), it("Roast veg: peppers, carrots, red onion, broccoli", "300 g", 100, 5, 20, 1), it("Olive oil", "1 tbsp", 120, 0, 0, 14), FERMENT],
};

// ---- the week --------------------------------------------------------------------------------

const FRUIT_TRAINING: PlanMeal = { slot: "Fruit", name: "Fruit", items: [it("Banana", "1", 105, 1, 27, 0)] };
const training = (dinner: PlanMeal): PlanMeal[] => [SHAKE, BOWL_TRAINING, SNACK_TRAINING, dinner, FRUIT_TRAINING];
const rest = (dinner: PlanMeal): PlanMeal[] => [SHAKE, BOWL_REST, SNACK_REST, dinner, FRUIT_REST];

export const WEEK: PlanDay[] = [
  { day: "Monday", short: "Mon", kind: "rest", meals: rest(DINNER_THIGHS_ROAST) },
  { day: "Tuesday", short: "Tue", kind: "training", meals: training(DINNER_STEAK_TRAINING) },
  { day: "Wednesday", short: "Wed", kind: "rest", meals: rest(DINNER_TURKEY_RAGU) },
  { day: "Thursday", short: "Thu", kind: "training", meals: training(DINNER_CHICKEN_RICE) },
  { day: "Friday", short: "Fri", kind: "rest", meals: rest(DINNER_STEAK_AVOCADO) },
  { day: "Saturday", short: "Sat", kind: "training", meals: training(DINNER_TURKEY_CHILLI) },
  { day: "Sunday", short: "Sun", kind: "rest", meals: rest(DINNER_STEAK_ROAST_VEG) },
];

export function sum(items: Macro[]): Macro {
  return items.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 });
}
export const mealTotal = (m: PlanMeal): Macro => sum(m.items);
export const dayTotal = (d: PlanDay): Macro => sum(d.meals.map(mealTotal));

export const RULES: string[] = [
  "Protein 200 g every day. The shake is identical every day; training days (Tue, Thu, Sat) get more rice at lunch and less oil at dinner, rest days get guac and more oil.",
  "Burrito places: always a bowl. Training day = double rice, single chicken, no guac. Rest day = single rice, double chicken, add guac. Never cheese or sour cream.",
  "Dinner is always the same shape: 200 g protein, potatoes or rice, 300 g veg weighed raw, a forkful of sauerkraut. Steak three nights (Tue, Fri, Sun), chicken or turkey the other four. Bigger potato and less oil on training days.",
  "Collagen is taken but not counted as protein (it has no tryptophan and little leucine).",
  "No gluten, dairy, eggs or fish anywhere in the plan. Tamari instead of soy sauce, gluten-free oats and pasta, olive oil instead of butter.",
  "Gut repair: aim for 30 different plants a week (every veg, fruit, bean, nut, seed, herb and spice counts), something fermented every day, cook potatoes and rice ahead and reheat for resistant starch, keep alcohol and ultra-processed food out.",
  "Water 2.5–3.5 L a day, more around training. Weigh the raw meat, the potatoes and the veg for the first fortnight, then eyeball.",
];

export const SHOPPING: { group: string; items: string[] }[] = [
  {
    group: "Shake (every day)",
    items: ["Protein powder — 21 scoops this week (630 g), so a second 480 g bag", "Frozen mixed berries 2.5 kg (7 × 350 g)", "Gluten-free oats 350 g", "Nuts and seeds 210 g (7 × 30 g)", "Collagen, creatine — already have"],
  },
  {
    group: "Meat",
    items: ["Sirloin steak 3 × 200 g (Tue, Fri, Sun)", "Chicken breast 220 g (Thu)", "Chicken thighs, skinless 220 g (Mon)", "Turkey mince 5% 600 g (Wed, and Sat made double)", "Sliced chicken or turkey 300 g (snack swaps)"],
  },
  {
    group: "Carbs",
    items: ["Potatoes 2.5 kg", "Rice 500 g", "Gluten-free pasta 80 g", "Rice cakes 1 pack", "Medjool dates 1 pack"],
  },
  {
    group: "Fruit and veg",
    items: ["Bananas 10", "Apples 7", "Avocados 1", "Broccoli 3 heads (~900 g)", "Snack peppers 600 g", "Carrots 500 g", "Courgette 1", "Red onions 2, onions 3, garlic, ginger, 1 chilli", "Spinach 200 g", "Tinned tomatoes 3", "Kidney beans 1 tin", "Fresh herbs: parsley, coriander"],
  },
  {
    group: "Gut",
    items: ["Sauerkraut, unpasteurised (fridge aisle) 1 jar", "Vegan kimchi 1 jar (check: no fish sauce or shrimp)", "Kombucha, a few bottles", "Coconut yoghurt with live cultures (optional, a spoon with the fruit)", "Mixed seeds: chia, flax, pumpkin"],
  },
  {
    group: "Cupboard",
    items: ["Olive oil", "Sesame oil", "Tamari (gluten-free soy)", "Chilli powder, cumin, paprika, oregano, turmeric", "Salt, pepper"],
  },
  {
    group: "Lunch out",
    items: ["Burrito bowl 5 × (Mon–Fri). Weekend: Saturday chilli leftovers or a bowl; Sunday lunch is a bowl or sliced chicken + potatoes + greens."],
  },
];
