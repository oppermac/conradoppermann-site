/**
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

const SHAKE_TRAINING: PlanMeal = {
  slot: "Breakfast",
  name: "Shake · training day",
  note: "800 ml with water. Extra oats, no nuts — training days are capped at 50 g fat.",
  items: [POWDER, COLLAGEN, CREATINE, BERRIES, it("Gluten-free oats", "big handful · 60 g", 225, 7.5, 38, 4.5)],
};

const SHAKE_REST: PlanMeal = {
  slot: "Breakfast",
  name: "Shake · rest day",
  note: "800 ml with water. Handful of nuts and seeds goes in on rest days.",
  items: [POWDER, COLLAGEN, CREATINE, BERRIES, it("Gluten-free oats", "handful · 40 g", 150, 5, 25, 3), it("Nuts and seeds", "handful · 30 g", 180, 6, 5, 15)],
};

const BOWL_TRAINING: PlanMeal = {
  slot: "Lunch",
  name: "Burrito bowl · training",
  note: "Double rice, double chicken, black beans, salsa, corn. No guac, cheese or sour cream.",
  items: [
    it("Rice", "double", 400, 8, 88, 2),
    it("Chicken", "double · ~220 g cooked", 350, 65, 0, 8),
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

const FRUIT_TRAINING: PlanMeal = { slot: "Fruit", name: "Fruit", items: [it("Apple", "1", 80, 0, 20, 0)] };
const FRUIT_REST: PlanMeal = { slot: "Fruit", name: "Fruit", items: [it("Banana", "1", 105, 1, 27, 0)] };

const GREENS = it("Greens (broccoli, green beans or spinach)", "200 g", 60, 5, 8, 0);
const OIL_TSP = it("Olive oil", "1 tsp", 45, 0, 0, 5);

// Training-day dinners: lean protein, big carb, little fat.
const DINNER_STEAK_TRAINING: PlanMeal = {
  slot: "Dinner",
  name: "Steak, potatoes, greens",
  items: [it("Sirloin steak, trimmed", "200 g raw", 330, 46, 0, 15), it("Potatoes", "500 g", 388, 10, 85, 0), GREENS, OIL_TSP],
};
const DINNER_CHICKEN_RICE: PlanMeal = {
  slot: "Dinner",
  name: "Chicken stir-fry with rice",
  note: "Tamari (gluten-free soy), garlic, ginger, chilli.",
  items: [it("Chicken breast", "220 g raw", 240, 50, 0, 5), it("Rice", "125 g dry", 450, 9, 98, 1), it("Stir-fry veg", "200 g", 60, 4, 10, 0), it("Sesame or olive oil", "1 tsp", 45, 0, 0, 5)],
};
const DINNER_TURKEY_CHILLI: PlanMeal = {
  slot: "Dinner",
  name: "Turkey chilli with rice",
  note: "Make double on Saturday: it is Monday's lunch fallback.",
  items: [it("Turkey mince 5%", "200 g raw", 240, 44, 0, 6), it("Kidney beans", "120 g drained", 120, 8, 20, 1), it("Tomatoes, onion, pepper", "", 80, 3, 15, 0), it("Rice", "100 g dry", 360, 7, 78, 1), OIL_TSP],
};

// Rest-day dinners: same shape, fat from the meat, oil or avocado.
const DINNER_THIGHS_ROAST: PlanMeal = {
  slot: "Dinner",
  name: "Roast chicken thighs and potatoes",
  items: [it("Chicken thighs, skin off", "220 g raw", 260, 42, 0, 10), it("Potatoes, roasted", "400 g", 310, 8, 68, 0), it("Olive oil", "1 tbsp", 120, 0, 0, 14), GREENS],
};
const DINNER_MINCE_PASTA: PlanMeal = {
  slot: "Dinner",
  name: "Beef ragù with gluten-free pasta",
  items: [it("Beef mince 10%", "200 g raw", 350, 38, 0, 22), it("Tomato sauce, onion, garlic", "", 80, 3, 15, 0), it("Gluten-free pasta", "80 g dry", 280, 6, 61, 1), OIL_TSP],
};
const DINNER_STEAK_AVOCADO: PlanMeal = {
  slot: "Dinner",
  name: "Steak, avocado, potatoes, greens",
  items: [it("Sirloin steak, trimmed", "200 g raw", 330, 46, 0, 15), it("Avocado", "half", 120, 1, 2, 11), it("Potatoes", "300 g", 234, 6, 51, 0), GREENS],
};
const DINNER_LAMB: PlanMeal = {
  slot: "Dinner",
  name: "Lamb chops, potatoes, greens",
  note: "Sunday roast shape. Trim the fat.",
  items: [it("Lamb loin chops, trimmed", "220 g raw", 430, 40, 0, 30), it("Potatoes", "400 g", 310, 8, 68, 0), GREENS],
};

// ---- the week --------------------------------------------------------------------------------

const training = (dinner: PlanMeal): PlanMeal[] => [SHAKE_TRAINING, BOWL_TRAINING, SNACK_TRAINING, dinner, FRUIT_TRAINING];
const rest = (dinner: PlanMeal): PlanMeal[] => [SHAKE_REST, BOWL_REST, SNACK_REST, dinner, FRUIT_REST];

export const WEEK: PlanDay[] = [
  { day: "Monday", short: "Mon", kind: "rest", meals: rest(DINNER_THIGHS_ROAST) },
  { day: "Tuesday", short: "Tue", kind: "training", meals: training(DINNER_STEAK_TRAINING) },
  { day: "Wednesday", short: "Wed", kind: "rest", meals: rest(DINNER_MINCE_PASTA) },
  { day: "Thursday", short: "Thu", kind: "training", meals: training(DINNER_CHICKEN_RICE) },
  { day: "Friday", short: "Fri", kind: "rest", meals: rest(DINNER_STEAK_AVOCADO) },
  { day: "Saturday", short: "Sat", kind: "training", meals: training(DINNER_TURKEY_CHILLI) },
  { day: "Sunday", short: "Sun", kind: "rest", meals: rest(DINNER_LAMB) },
];

export function sum(items: Macro[]): Macro {
  return items.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { kcal: 0, p: 0, c: 0, f: 0 });
}
export const mealTotal = (m: PlanMeal): Macro => sum(m.items);
export const dayTotal = (d: PlanDay): Macro => sum(d.meals.map(mealTotal));

export const RULES: string[] = [
  "Protein 200 g every day. Training days (Tue, Thu, Sat) are high carb, low fat. Rest days are moderate carb, more fat.",
  "Burrito places: always a bowl. Training day = double rice, no guac. Rest day = single rice, add guac. Always double chicken, never cheese or sour cream.",
  "Dinner is always the same shape: a hand-sized protein, potatoes or rice, greens. Bigger potato and less oil on training days.",
  "Collagen is taken but not counted as protein (it has no tryptophan and little leucine).",
  "No gluten, dairy, eggs or fish anywhere in the plan. Tamari instead of soy sauce, gluten-free oats and pasta, olive oil instead of butter.",
  "Water 2.5–3.5 L a day, more around training. Weigh the raw meat and the potatoes for the first fortnight, then eyeball.",
];

export const SHOPPING: { group: string; items: string[] }[] = [
  {
    group: "Shake (every day)",
    items: ["Protein powder — 21 scoops this week (630 g), so a second 480 g bag", "Frozen mixed berries 2.5 kg (7 × 350 g)", "Gluten-free oats 350 g", "Nuts and seeds 120 g (4 × 30 g)", "Collagen, creatine — already have"],
  },
  {
    group: "Meat",
    items: ["Sirloin steak 3 × 200 g (Tue, Fri, plus one spare)", "Chicken breast 220 g (Thu)", "Chicken thighs, skinless 220 g (Mon)", "Beef mince 10% 200 g (Wed)", "Turkey mince 5% 400 g (Sat, make double)", "Lamb loin chops 220 g (Sun)", "Sliced chicken or turkey 300 g (snack swaps)"],
  },
  {
    group: "Carbs",
    items: ["Potatoes 2.5 kg", "Rice 500 g", "Gluten-free pasta 80 g", "Rice cakes 1 pack", "Medjool dates 1 pack"],
  },
  {
    group: "Fruit and veg",
    items: ["Bananas 7", "Apples 7", "Avocados 1", "Broccoli 2 heads", "Green beans 400 g", "Spinach 400 g", "Stir-fry veg 200 g", "Onions 3, garlic, ginger, 1 chilli", "Peppers 2", "Tinned tomatoes 2", "Kidney beans 1 tin"],
  },
  {
    group: "Cupboard",
    items: ["Olive oil", "Sesame oil", "Tamari (gluten-free soy)", "Chilli powder, cumin, paprika", "Salt, pepper"],
  },
  {
    group: "Lunch out",
    items: ["Burrito bowl 5 × (Mon–Fri). Weekend: Saturday chilli leftovers or a bowl; Sunday lunch is a bowl or sliced chicken + potatoes + greens."],
  },
];
