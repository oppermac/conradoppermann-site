/** One-off: realign meals.day with eaten_at (PATCH used to change the time without the day). */
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { db } = await import("../src/lib/hub/db/client");
  const { meals } = await import("../src/lib/hub/db/schema");
  const { eq } = await import("drizzle-orm");
  const { dayKey } = await import("../src/lib/hub/time");
  const rows = await db.select({ id: meals.id, day: meals.day, eatenAt: meals.eatenAt, name: meals.name, status: meals.status }).from(meals);
  let n = 0;
  for (const r of rows) {
    if (r.status !== "confirmed") continue;
    const d = dayKey(r.eatenAt);
    if (d !== r.day) { await db.update(meals).set({ day: d }).where(eq(meals.id, r.id)); n++; console.log(`${r.name}: ${r.day} → ${d}`); }
  }
  console.log(`realigned ${n}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
