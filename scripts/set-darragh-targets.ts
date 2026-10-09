/** One-off: set the hub's nutrition targets to Darragh Hayes' plan (23 Sep 2026). Run: npx tsx scripts/set-darragh-targets.ts */
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { updateSettings } = await import("../src/lib/hub/settings");
  const next = await updateSettings({
    nutrition: {
      kcal: 2664, proteinG: 200, carbsG: 286, fatG: 80,           // non-training day
      trainingDay: { kcal: 2802, proteinG: 200, carbsG: 388, fatG: 50 },
      derived: false, derivedAt: null, weightKg: 83.7, proteinPerKg: 2.4, fatPct: 0.27, mode: "lose",
    },
  });
  console.log(JSON.stringify(next.nutrition));
}
main().catch((e) => { console.error(e); process.exit(1); });
