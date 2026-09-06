/** Shared writers for manual logs (Log sheet, coach tools, MCP). */
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { activities, checkins } from "../db/schema";
import { dayKey, dublin, localToUtc } from "../time";
import { ACTIVITY_TYPE_BY_ID } from "./activity-types";

export type LogActivityInput = {
  typeId: string;
  title?: string | null;
  occurredAt?: string | null; // ISO or "YYYY-MM-DD HH:MM" local
  durationMin?: number | null;
  people?: string[] | null;
  memorable?: boolean | null;
  rating?: number | null;
  notes?: string | null;
  source?: "manual" | "coach" | "mcp";
};

export function parseWhen(value: string | null | undefined): Date {
  if (!value) return new Date();
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/.exec(value);
  if (m) return localToUtc(m[1], m[2]);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Bad time: ${value}`);
  return d;
}

export async function logActivity(input: LogActivityInput) {
  const type = ACTIVITY_TYPE_BY_ID[input.typeId];
  if (!type || type.domain === "none") throw new Error(`Unknown activity type ${input.typeId}`);
  const occurredAt = parseWhen(input.occurredAt);
  const [row] = await db
    .insert(activities)
    .values({
      occurredAt,
      day: dayKey(occurredAt),
      domain: type.domain,
      kind: type.kind,
      typeId: type.id,
      title: input.title?.trim() || type.label,
      durationMin: input.durationMin ?? null,
      people: input.people?.length ? input.people : null,
      memorable: Boolean(input.memorable) || type.id === "memorable",
      rating: input.rating ?? null,
      notes: input.notes ?? null,
      weights: type.drops,
      source: input.source ?? "manual",
    })
    .returning();
  return row;
}

export type CheckinPatch = { mood?: number | null; energy?: number | null; gratitude?: string | null; notes?: string | null; weightKg?: number | null; bedtimeLocal?: string | null };

export async function setCheckin(day: string | null | undefined, patch: CheckinPatch) {
  const key = day ?? dublin().dayKey;
  const values = {
    ...(patch.mood !== undefined ? { mood: patch.mood } : {}),
    ...(patch.energy !== undefined ? { energy: patch.energy } : {}),
    ...(patch.gratitude !== undefined ? { gratitude: patch.gratitude } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.weightKg !== undefined ? { weightKg: patch.weightKg } : {}),
    ...(patch.bedtimeLocal !== undefined ? { bedtimeLocal: patch.bedtimeLocal, bedtimeSource: "manual" as const } : {}),
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(checkins)
    .values({ day: key, ...values })
    .onConflictDoUpdate({ target: checkins.day, set: values })
    .returning();
  return row;
}

export async function voidActivity(id: string, voided = true) {
  await db.update(activities).set({ void: voided }).where(eq(activities.id, id));
}
