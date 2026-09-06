import { and, desc, isNotNull } from "drizzle-orm";
import { db } from "../db/client";
import { whoopCycles } from "../db/schema";
import { getSettings, updateSettings, type Settings } from "../settings";
import { whoopApi } from "../whoop/client";

export type NutritionTargets = { kcal: number; proteinG: number; carbsG: number; fatG: number };

const round10 = (n: number) => Math.round(n / 10) * 10;

/**
 * Maintenance = mean daily energy expenditure Whoop measured (kJ → kcal). Mode adjusts ±; protein from
 * body weight when known, otherwise 25 % of energy; fat as a share of energy; carbs take the remainder.
 */
export function deriveNutrition(
  kilojoules: number[],
  weightKg: number | null,
  n: Pick<Settings["nutrition"], "proteinPerKg" | "fatPct" | "mode">,
): NutritionTargets | null {
  const valid = kilojoules.filter((k) => Number.isFinite(k) && k > 2000);
  if (valid.length < 3) return null;
  const meanKcal = valid.reduce((a, b) => a + b, 0) / valid.length / 4.184;
  const factor = n.mode === "lose" ? 0.85 : n.mode === "build" ? 1.1 : 1;
  const kcal = round10(meanKcal * factor);
  const proteinG = weightKg ? Math.round(n.proteinPerKg * weightKg) : Math.round((kcal * 0.25) / 4);
  const fatG = Math.round((kcal * n.fatPct) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { kcal, proteinG, carbsG, fatG };
}

/** Job `targets.derive`: recompute from the last 14 scored, completed Whoop days. No-op when overridden. */
export async function recomputeNutritionTargets(): Promise<{ updated: boolean; targets?: NutritionTargets; reason?: string }> {
  const { settings } = await getSettings();
  if (!settings.nutrition.derived) return { updated: false, reason: "manual override" };
  const rows = await db
    .select({ kilojoule: whoopCycles.kilojoule })
    .from(whoopCycles)
    .where(and(isNotNull(whoopCycles.kilojoule), isNotNull(whoopCycles.end)))
    .orderBy(desc(whoopCycles.start))
    .limit(14);
  let weightKg = settings.nutrition.weightKg;
  try {
    const body = await whoopApi.body();
    if (body?.weight_kilogram) weightKg = Math.round(body.weight_kilogram * 10) / 10;
  } catch {
    /* keep the stored weight */
  }
  const targets = deriveNutrition(
    rows.map((r) => r.kilojoule ?? 0),
    weightKg,
    settings.nutrition,
  );
  if (!targets) return { updated: false, reason: "not enough Whoop days yet" };
  await updateSettings({
    nutrition: { ...targets, weightKg, derivedAt: new Date().toISOString() },
  });
  return { updated: true, targets };
}
