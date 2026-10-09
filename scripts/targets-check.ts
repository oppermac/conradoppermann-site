/** Dev utility: shows which recent days count as training days and the targets applied. Run: npx tsx scripts/targets-check.ts */
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { getSettings } = await import("../src/lib/hub/settings");
  const { resolveTargets } = await import("../src/lib/hub/meals/day-targets");
  const { dayKey, addDays, dayRange } = await import("../src/lib/hub/time");
  const { settings } = await getSettings();
  const days = dayRange(addDays(dayKey(), -13), dayKey());
  const map = await resolveTargets(days, settings.nutrition);
  for (const d of days) {
    const t = map.get(d)!;
    console.log(`${d}  ${t.trainingDay ? "TRAINING" : "rest    "}  ${t.kcal} kcal  P${t.proteinG} C${t.carbsG} F${t.fatG}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
