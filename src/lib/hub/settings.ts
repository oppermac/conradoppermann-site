import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, hasDb } from "./db/client";
import { settings as settingsTable } from "./db/schema";
import { CUP_CAPACITY_DEFAULT } from "./domain/activity-types";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "HH:MM");

export const PRIMARY_CALENDAR_ID = "conrad@maverick-social.com";
export const CONRADS_CALENDAR_ID =
  "c_6333c65b2d54d9df55fc5ef4386402fb86c23d435db5fcecc1a1bdda71a6da7a@group.calendar.google.com";
export const PRIVATE_TIME_CALENDAR_ID =
  "c_49c6cab7a3a3f0d189d446623ca92b1f9f49e7a20c0aac378ef89cbff5d0c4fa@group.calendar.google.com";

export const SettingsSchema = z.object({
  targets: z.object({
    work: z.object({ ceoBlocks: z.number().int().min(0).max(10), opReview: z.number().int().min(0).max(5) }),
    body: z.object({
      sessions: z.number().int().min(0).max(14),
      minSessions: z.number().int().min(0).max(14),
      cardio: z.number().int().min(0).max(14),
      strength: z.number().int().min(0).max(14),
      minSessionMin: z.number().int().min(5).max(120),
      walkCardioMin: z.number().int().min(10).max(180),
      walkCardioStrain: z.number().min(0).max(21),
    }),
    relationships: z.object({ friendPlans: z.number().int().min(0).max(14), familyTouch: z.number().int().min(0).max(7) }),
    aliveness: z.object({ enjoyable: z.number().int().min(0).max(7), memorablePerMonth: z.number().int().min(0).max(10) }),
  }),
  nutrition: z.object({
    kcal: z.number().int().min(800).max(6000).nullable(),
    proteinG: z.number().min(0).max(400).nullable(),
    carbsG: z.number().min(0).max(800).nullable(),
    fatG: z.number().min(0).max(300).nullable(),
    derived: z.boolean(),
    derivedAt: z.string().nullable(),
    weightKg: z.number().min(30).max(250).nullable(),
    proteinPerKg: z.number().min(0.8).max(3),
    fatPct: z.number().min(0.15).max(0.45),
    mode: z.enum(["maintain", "lose", "build"]),
  }),
  sleep: z.object({ bedtimeStart: hhmm, bedtimeEnd: hhmm, graceMin: z.number().int().min(0).max(60) }),
  calendars: z.object({ read: z.array(z.string()), write: z.string().nullable() }),
  notifications: z.object({
    push: z.boolean(),
    slack: z.boolean(),
    quietStart: hhmm,
    quietEnd: hhmm,
    dailyCap: z.number().int().min(0).max(10),
    quietWeek: z.boolean(),
    briefTime: hhmm,
    reviewTime: hhmm,
    bedtimeReminder: z.boolean(),
    bedtimeLeadMin: z.number().int().min(0).max(120),
    ratingPrompts: z.boolean(),
  }),
  whoop: z.object({ sportKinds: z.record(z.string(), z.string()) }),
  cups: z.object({
    capacity: z.number().int().min(4).max(20),
    weightOverrides: z.record(z.string(), z.record(z.string(), z.number().int().min(0).max(3))),
    caps: z.record(z.string(), z.number().int().min(0).max(14)),
  }),
  aliveness: z.object({ list: z.array(z.string()) }),
  workHours: z.object({ start: hhmm, end: hhmm }),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsSection = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  targets: {
    work: { ceoBlocks: 3, opReview: 1 },
    body: { sessions: 4, minSessions: 3, cardio: 2, strength: 2, minSessionMin: 20, walkCardioMin: 45, walkCardioStrain: 8 },
    relationships: { friendPlans: 2, familyTouch: 1 },
    aliveness: { enjoyable: 1, memorablePerMonth: 1 },
  },
  nutrition: {
    kcal: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    derived: true,
    derivedAt: null,
    weightKg: null,
    proteinPerKg: 1.6,
    fatPct: 0.3,
    mode: "maintain",
  },
  sleep: { bedtimeStart: "22:30", bedtimeEnd: "23:30", graceMin: 10 },
  calendars: {
    read: [PRIMARY_CALENDAR_ID, CONRADS_CALENDAR_ID, PRIVATE_TIME_CALENDAR_ID],
    write: PRIVATE_TIME_CALENDAR_ID,
  },
  notifications: {
    push: true,
    slack: true,
    quietStart: "22:00",
    quietEnd: "07:30",
    dailyCap: 2,
    quietWeek: false,
    briefTime: "07:00",
    reviewTime: "18:00",
    bedtimeReminder: false,
    bedtimeLeadMin: 30,
    ratingPrompts: true,
  },
  whoop: { sportKinds: {} },
  cups: { capacity: CUP_CAPACITY_DEFAULT, weightOverrides: {}, caps: {} },
  aliveness: { list: [] },
  workHours: { start: "09:00", end: "18:00" },
};

const SECTION_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingsSection[];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge `patch` over `base` (arrays replace, objects merge). */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch === undefined ? base : (patch as T)) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    const current = (base as Record<string, unknown>)[k];
    out[k] = isPlainObject(current) && isPlainObject(v) ? deepMerge(current, v) : v;
  }
  return out as T;
}

export type LoadedSettings = { settings: Settings; dbConnected: boolean; stored: Partial<Record<SettingsSection, boolean>> };

/** Read every section, merged over defaults and validated. Falls back to defaults when the DB is absent. */
export async function getSettings(): Promise<LoadedSettings> {
  if (!hasDb) return { settings: DEFAULT_SETTINGS, dbConnected: false, stored: {} };
  const rows = await db.select().from(settingsTable);
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  const stored: Partial<Record<SettingsSection, boolean>> = {};
  for (const row of rows) {
    const key = row.key as SettingsSection;
    if (!SECTION_KEYS.includes(key)) continue;
    merged[key] = deepMerge(DEFAULT_SETTINGS[key], row.value);
    stored[key] = true;
  }
  const parsed = SettingsSchema.safeParse(merged);
  return { settings: parsed.success ? parsed.data : DEFAULT_SETTINGS, dbConnected: true, stored };
}

/** Validate and upsert a partial patch, section by section. Returns the full merged settings. */
export async function updateSettings(patch: Partial<Record<SettingsSection, unknown>>): Promise<Settings> {
  const current = (await getSettings()).settings;
  const next = SettingsSchema.parse(deepMerge(current, patch));
  for (const key of Object.keys(patch) as SettingsSection[]) {
    if (!SECTION_KEYS.includes(key)) continue;
    await db
      .insert(settingsTable)
      .values({ key, value: next[key] })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: next[key], updatedAt: new Date() } });
  }
  return next;
}

export async function resetSection(key: SettingsSection): Promise<void> {
  await db.delete(settingsTable).where(eq(settingsTable.key, key));
}
