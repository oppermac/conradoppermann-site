/** Dev utility: prints this week's gaps, suggestions, cups and classification samples from the live database. Run: npx tsx scripts/gaps-check.ts */
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { computeGapsAndSuggestions } = await import("../src/lib/hub/domain/engine");
  const { db } = await import("../src/lib/hub/db/client");
  const { calendarEvents, activities } = await import("../src/lib/hub/db/schema");
  const { sql, eq, isNull, and } = await import("drizzle-orm");
  const r = await computeGapsAndSuggestions();
  console.log("GAPS:");
  for (const g of r.gaps) console.log(`  [${g.risk}] ${g.label}: ${g.done} done + ${g.scheduled} scheduled of ${g.target} → needs ${g.needs}`);
  console.log("SUGGESTIONS:");
  for (const s of r.suggestions) console.log(`  ${s.title} — ${s.reason} | slots: ${s.slots.map((x) => x.label).join(", ") || "none"}`);
  console.log("CUPS (this week):", r.cups.map((c) => `${c.cup} ${c.drops}/${c.capacity}`).join(", "), "| low:", r.lowCups.join(",") || "none");
  const ai = await db.select({ title: calendarEvents.title, domain: calendarEvents.domain, kind: calendarEvents.kind, by: calendarEvents.classifiedBy }).from(calendarEvents).where(and(eq(calendarEvents.deleted, false), sql`${calendarEvents.classifiedBy} = 'ai' or ${calendarEvents.classifiedBy} is null`));
  console.log("AI-classified / unresolved:", ai.map((e) => `"${e.title}" → ${e.domain ?? "?"}/${e.kind ?? "?"} (${e.by ?? "unresolved"})`).join(" | "));
  const sample = await db.select({ title: calendarEvents.title, domain: calendarEvents.domain, kind: calendarEvents.kind }).from(calendarEvents).where(and(eq(calendarEvents.deleted, false), sql`${calendarEvents.kind} in ('enjoyable','ceo_block','training','date','friend_plan','family_touchpoint')`));
  console.log("Interesting rule matches:", sample.map((e) => `"${e.title}" → ${e.kind}`).join(" | "));
  const acts = await db.select({ day: activities.day, typeId: activities.typeId, title: activities.title, source: activities.source, void: activities.void, notes: activities.notes }).from(activities).where(eq(activities.source, "calendar"));
  console.log("Calendar-derived activities:", acts.map((a) => `${a.day} ${a.typeId} "${a.title}"${a.void ? " (void: " + a.notes + ")" : ""}`).join(" | ") || "none");
}
main().catch((e) => { console.error(e); process.exit(1); });
