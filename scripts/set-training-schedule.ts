/** One-off: planned resistance days Tue + Thu plus one flexible weekend day. Run: npx tsx scripts/set-training-schedule.ts */
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { updateSettings } = await import("../src/lib/hub/settings");
  const n = await updateSettings({ nutrition: { trainingSchedule: { weekdays: [2, 4], weekendFlex: true } } });
  console.log(JSON.stringify(n.nutrition.trainingSchedule));
}
main().catch((e) => { console.error(e); process.exit(1); });
