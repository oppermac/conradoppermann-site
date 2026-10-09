/**
 * Carb cycling (Darragh's plan): a resistance-training day gets `nutrition.trainingDay` targets, every other
 * day gets the base targets. A day counts as a training day when Whoop recorded a strength/mixed session,
 * a strength session was logged by hand, or a training event is on the calendar that day (a PT session is
 * known in the morning, so the day's targets apply from breakfast).
 */
import { and, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { db } from "../db/client";
import { activities, calendarEvents, whoopWorkouts, type WorkoutKind } from "../db/schema";
import type { Settings } from "../settings";
import { addDays, dublin, localToUtc, type DayKey } from "../time";

export type NutritionTargets = { kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null };
export type DayTargets = NutritionTargets & { trainingDay: boolean; cycling: boolean };

const STRENGTH_KINDS: WorkoutKind[] = ["strength", "mixed"];
const STRENGTH_TYPES = ["strength", "mixed"];

/** Which of `days` are training days. One query per source, not per day. */
export async function trainingDays(days: DayKey[]): Promise<Set<DayKey>> {
  const out = new Set<DayKey>();
  if (days.length === 0) return out;
  const first = days.reduce((a, b) => (a < b ? a : b));
  const last = days.reduce((a, b) => (a > b ? a : b));
  const [workouts, acts, events] = await Promise.all([
    db
      .select({ day: whoopWorkouts.day })
      .from(whoopWorkouts)
      .where(and(gte(whoopWorkouts.day, first), lte(whoopWorkouts.day, last), eq(whoopWorkouts.countsAsSession, true), inArray(whoopWorkouts.kind, STRENGTH_KINDS))),
    db
      .select({ day: activities.day })
      .from(activities)
      .where(and(gte(activities.day, first), lte(activities.day, last), eq(activities.void, false), inArray(activities.typeId, STRENGTH_TYPES))),
    db
      .select({ start: calendarEvents.start })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.deleted, false), eq(calendarEvents.kind, "training"), gte(calendarEvents.start, localToUtc(first, "00:00")), lt(calendarEvents.start, localToUtc(addDays(last, 1), "00:00")))),
  ]);
  const wanted = new Set(days);
  for (const w of workouts) if (wanted.has(w.day)) out.add(w.day);
  for (const a of acts) if (wanted.has(a.day)) out.add(a.day);
  for (const e of events) {
    const d = dublin(e.start).dayKey;
    if (wanted.has(d)) out.add(d);
  }
  return out;
}

export function targetsFor(nutrition: Settings["nutrition"], isTraining: boolean): DayTargets {
  const cycling = nutrition.trainingDay !== null;
  const t = cycling && isTraining ? nutrition.trainingDay! : nutrition;
  return { kcal: t.kcal, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG, trainingDay: cycling && isTraining, cycling };
}

/** Targets for several days at once (dashboards, consistency counts, cups). */
export async function resolveTargets(days: DayKey[], nutrition: Settings["nutrition"]): Promise<Map<DayKey, DayTargets>> {
  const training = nutrition.trainingDay ? await trainingDays(days) : new Set<DayKey>();
  return new Map(days.map((d) => [d, targetsFor(nutrition, training.has(d))]));
}

export async function targetsForDay(day: DayKey, nutrition: Settings["nutrition"]): Promise<DayTargets> {
  return (await resolveTargets([day], nutrition)).get(day)!;
}
