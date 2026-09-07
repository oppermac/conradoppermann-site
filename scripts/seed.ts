/**
 * Seeds default settings rows and calendar-classification rules.
 *
 * Idempotent:
 *  - a `settings` row is inserted per DEFAULT_SETTINGS section only where that key is
 *    still absent — an existing row (including one with admin edits) is never overwritten.
 *  - the seed classification rules (source "seed") are inserted as one batch, and only
 *    if no `source: "seed"` row exists yet — re-running never duplicates them.
 *
 * Run: npm run db:seed  (loads .env.local)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

type SeedRule = { pattern: string; domain: string; kind: string; priority?: number };

/** pattern → domain/kind, priority 10 unless noted. */
const SEED_RULES: SeedRule[] = [
  // work / ceo_block
  { pattern: "ceo block", domain: "work", kind: "ceo_block" },
  { pattern: "growth block", domain: "work", kind: "ceo_block" },
  { pattern: "commercial machine", domain: "work", kind: "ceo_block" },
  { pattern: "deep work", domain: "work", kind: "ceo_block" },
  { pattern: "strategy", domain: "work", kind: "ceo_block" },
  { pattern: "focus", domain: "work", kind: "ceo_block" },

  // work / operating_review
  { pattern: "operating review", domain: "work", kind: "operating_review" },
  { pattern: "ops review", domain: "work", kind: "operating_review" },
  { pattern: "weekly review", domain: "work", kind: "operating_review" },
  { pattern: "l10", domain: "work", kind: "operating_review" },

  // work / shoot
  { pattern: "shoot", domain: "work", kind: "shoot" },
  { pattern: "recce", domain: "work", kind: "shoot" },
  { pattern: "edit review", domain: "work", kind: "shoot" },

  // body / training
  { pattern: "gym", domain: "body", kind: "training" },
  { pattern: "strength", domain: "body", kind: "training" },
  { pattern: "run", domain: "body", kind: "training" },
  { pattern: "swim", domain: "body", kind: "training" },
  { pattern: "pilates", domain: "body", kind: "training" },
  { pattern: "pt ", domain: "body", kind: "training" },

  // relationships / friend_plan
  { pattern: "dinner with", domain: "relationships", kind: "friend_plan" },
  { pattern: "drinks", domain: "relationships", kind: "friend_plan" },
  { pattern: "coffee with", domain: "relationships", kind: "friend_plan" },
  { pattern: "pints", domain: "relationships", kind: "friend_plan" },
  { pattern: "brunch", domain: "relationships", kind: "friend_plan" },
  { pattern: "catch up", domain: "relationships", kind: "friend_plan" },
  { pattern: "lunch with", domain: "relationships", kind: "friend_plan" },

  // relationships / family_touchpoint
  { pattern: "mum", domain: "relationships", kind: "family_touchpoint" },
  { pattern: "dad", domain: "relationships", kind: "family_touchpoint" },
  { pattern: "family", domain: "relationships", kind: "family_touchpoint" },
  { pattern: "call home", domain: "relationships", kind: "family_touchpoint" },

  // relationships / date
  { pattern: "date night", domain: "relationships", kind: "date" },
  { pattern: "date with", domain: "relationships", kind: "date" },

  // aliveness / enjoyable
  { pattern: "ticket:", domain: "aliveness", kind: "enjoyable" },
  { pattern: "premiere", domain: "aliveness", kind: "enjoyable" },
  { pattern: "cinema", domain: "aliveness", kind: "enjoyable" },
  { pattern: "gig", domain: "aliveness", kind: "enjoyable" },
  { pattern: "concert", domain: "aliveness", kind: "enjoyable" },
  { pattern: "theatre", domain: "aliveness", kind: "enjoyable" },
  { pattern: "opera", domain: "aliveness", kind: "enjoyable" },
  { pattern: "match", domain: "aliveness", kind: "enjoyable" },
  { pattern: "festival", domain: "aliveness", kind: "enjoyable" },
  { pattern: "sail", domain: "aliveness", kind: "enjoyable" },

  // aliveness / memorable
  { pattern: "trip", domain: "aliveness", kind: "memorable" },
  { pattern: "weekend away", domain: "aliveness", kind: "memorable" },
  { pattern: "holiday", domain: "aliveness", kind: "memorable" },

  // none / none — priority 5 so admin wins over vaguer matches
  { pattern: "flight", domain: "none", kind: "none", priority: 5 },
  { pattern: "dentist", domain: "none", kind: "none", priority: 5 },
  { pattern: "doctor", domain: "none", kind: "none", priority: 5 },
  { pattern: "admin", domain: "none", kind: "none", priority: 5 },
  { pattern: "cancel", domain: "none", kind: "none", priority: 4 },
  { pattern: "correspondance", domain: "none", kind: "none", priority: 5 },
  { pattern: "correspondence", domain: "none", kind: "none", priority: 5 },
  { pattern: "organise the next month", domain: "none", kind: "none", priority: 5 },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log(
      "DATABASE_URL is not set — nothing to seed. Create the Neon database on the Vercel project " +
        "(Storage → Neon) and run `vercel env pull .env.local`, then re-run `npm run db:seed`.",
    );
    return;
  }

  // Imported dynamically so dotenv has already populated process.env before db/client.ts reads it.
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/lib/hub/db/client");
  const { settings, classificationRules } = await import("../src/lib/hub/db/schema");
  const { DEFAULT_SETTINGS } = await import("../src/lib/hub/settings");

  // ---- settings: insert defaults for any section that isn't already stored ----
  const existingSettings = await db.select({ key: settings.key }).from(settings);
  const existingKeys = new Set(existingSettings.map((r) => r.key));
  const sectionKeys = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
  const missingKeys = sectionKeys.filter((k) => !existingKeys.has(k));

  for (const key of missingKeys) {
    await db
      .insert(settings)
      .values({ key, value: DEFAULT_SETTINGS[key] })
      .onConflictDoNothing({ target: settings.key });
  }

  if (missingKeys.length > 0) {
    console.log(`✔ Seeded ${missingKeys.length} settings section(s): ${missingKeys.join(", ")}`);
  } else {
    console.log("ℹ Settings already seeded — no sections inserted.");
  }
  const untouched = sectionKeys.filter((k) => existingKeys.has(k));
  if (untouched.length > 0) {
    console.log(
      `ℹ ${untouched.length} settings section(s) already had a stored row, left untouched: ${untouched.join(", ")}`,
    );
  }

  // ---- classification rules: seed once as a batch, never duplicate ----
  const existingSeedRule = await db
    .select({ id: classificationRules.id })
    .from(classificationRules)
    .where(eq(classificationRules.source, "seed"))
    .limit(1);

  if (existingSeedRule.length > 0) {
    console.log("ℹ Seed classification rules already exist — skipped.");
  } else {
    await db.insert(classificationRules).values(
      SEED_RULES.map((r) => ({
        pattern: r.pattern,
        domain: r.domain,
        kind: r.kind,
        priority: r.priority ?? 10,
        source: "seed" as const,
      })),
    );
    console.log(`✔ Seeded ${SEED_RULES.length} classification rule(s).`);
  }

  console.log("Done.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
