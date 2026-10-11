/** One-off: Darragh's plan = 3 resistance sessions a week (Tue/Thu PT + weekend) and 2 recovery sessions. Run: npx tsx scripts/set-darragh-body-targets.ts */
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { updateSettings } = await import("../src/lib/hub/settings");
  const n = await updateSettings({ targets: { body: { sessions: 3, minSessions: 3, cardio: 0, strength: 3, recovery: 2 } } });
  console.log(JSON.stringify(n.targets.body));
}
main().catch((e) => { console.error(e); process.exit(1); });
