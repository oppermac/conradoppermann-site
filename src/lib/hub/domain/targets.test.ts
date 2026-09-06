import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveNutrition } from "./targets";

test("derives maintenance macros from Whoop kilojoules", () => {
  const kj = Array(14).fill(11_300); // ≈ 2700 kcal/day
  const t = deriveNutrition(kj, 82, { proteinPerKg: 1.6, fatPct: 0.3, mode: "maintain" });
  assert.ok(t);
  assert.equal(t.kcal, 2700);
  assert.equal(t.proteinG, 131);
  assert.equal(t.fatG, 90);
  assert.equal(t.carbsG, Math.round((2700 - 131 * 4 - 90 * 9) / 4));
  const lose = deriveNutrition(kj, 82, { proteinPerKg: 2, fatPct: 0.3, mode: "lose" });
  assert.equal(lose?.kcal, 2300);
  assert.equal(lose?.proteinG, 164);
  assert.equal(deriveNutrition([11_300, 500], null, { proteinPerKg: 1.6, fatPct: 0.3, mode: "maintain" }), null);
});
