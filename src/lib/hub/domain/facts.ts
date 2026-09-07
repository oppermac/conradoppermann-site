/**
 * DB → BehaviourFacts for a week (done + scheduled per behaviour). This is the bridge between the raw
 * tables and the pure KPI/gap maths; every dashboard, nudge and the coach reads through here.
 */
import { and, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { activities, calendarEvents, checkins, whoopSleeps } from "../db/schema";
import { isConsistentDay, totalsForDays } from "../meals/store";
import type { Settings } from "../settings";
import { addDays, dayKey, dayRange, localToUtc, monthRange, weekStart, type DayKey } from "../time";
import type { BehaviourFacts } from "./kpis";

const TRAINING_TYPES = ["cardio", "strength", "mixed", "team_sport"];
const ENJOYABLE_TYPES = ["enjoyable", "memorable", "gig", "laughter", "nature"];

export type WeekWindow = { start: DayKey; end: DayKey; startAt: Date; endAt: Date };

export function weekWindow(anyDay: DayKey): WeekWindow {
  const start = weekStart(anyDay);
  const end = addDays(start, 6);
  return { start, end, startAt: localToUtc(start, "00:00"), endAt: localToUtc(addDays(start, 7), "00:00") };
}

async function activitiesIn(startAt: Date, endAt: Date) {
  return db
    .select()
    .from(activities)
    .where(and(gte(activities.occurredAt, startAt), lt(activities.occurredAt, endAt), eq(activities.void, false)));
}

async function scheduledEvents(startAt: Date, endAt: Date, now: Date, kinds: string[]) {
  const from = now > startAt ? now : startAt;
  const rows = await db
    .select({ id: calendarEvents.id, kind: calendarEvents.kind, start: calendarEvents.start, title: calendarEvents.title })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.deleted, false),
        gte(calendarEvents.end, from),
        lt(calendarEvents.start, endAt),
        inArray(calendarEvents.kind, kinds),
        or(sql`${calendarEvents.selfResponse} is null`, sql`${calendarEvents.selfResponse} <> 'declined'`),
      ),
    );
  return rows;
}

/** Sessions: Whoop rows plus manual training logs that don't sit within 30 min of a Whoop session. */
function dedupeSessions(rows: Array<typeof activities.$inferSelect>) {
  const whoop = rows.filter((a) => a.source === "whoop");
  const manual = rows.filter((a) => a.source !== "whoop");
  const kept = [...whoop];
  for (const m of manual) {
    const dup = whoop.some((w) => Math.abs(w.occurredAt.getTime() - m.occurredAt.getTime()) < 30 * 60 * 1000);
    if (!dup) kept.push(m);
  }
  return kept;
}

export async function weekFacts(anyDay: DayKey, settings: Settings, now = new Date()): Promise<BehaviourFacts[]> {
  const w = weekWindow(anyDay);
  const t = settings.targets;
  const [acts, sched] = await Promise.all([
    activitiesIn(w.startAt, w.endAt),
    scheduledEvents(w.startAt, w.endAt, now, ["ceo_block", "operating_review", "training", "friend_plan", "family_touchpoint", "date", "enjoyable", "memorable", "gig", "nature"]),
  ]);
  const count = (pred: (a: typeof activities.$inferSelect) => boolean) => acts.filter(pred).length;
  const schedCount = (kinds: string[]) => sched.filter((e) => e.kind && kinds.includes(e.kind)).length;

  // Training mix: mixed sessions fill whichever side is short.
  const sessions = dedupeSessions(acts.filter((a) => TRAINING_TYPES.includes(a.typeId)));
  let cardio = sessions.filter((a) => a.typeId === "cardio" || a.typeId === "team_sport").length;
  let strength = sessions.filter((a) => a.typeId === "strength").length;
  const mixedCount = sessions.filter((a) => a.typeId === "mixed").length;
  for (let i = 0; i < mixedCount; i++) {
    if (strength < t.body.strength && strength <= cardio) strength += 1;
    else cardio += 1;
  }

  // Meals: consistent days so far this week (only days that have started).
  const todayKey = dayKey(now);
  const daysSoFar = dayRange(w.start, w.end).filter((d) => d <= todayKey);
  const totals = await totalsForDays(daysSoFar);
  const consistentDays = totals.filter((d) => isConsistentDay(d, settings.nutrition)).length;

  // Bedtime: nights Mon..Sun keyed by the night's start day.
  const nights = await db
    .select({ day: checkins.day, status: checkins.bedtimeStatus, bedtime: checkins.bedtimeLocal })
    .from(checkins)
    .where(and(gte(checkins.day, w.start), lte(checkins.day, w.end)));
  const nightsWithData = nights.filter((n) => n.bedtime).length;
  const nightsIn = nights.filter((n) => n.status === "in" || n.status === "early").length;

  // Memorable is monthly.
  const m = monthRange(anyDay.slice(0, 7));
  const monthActs = await db
    .select({ id: activities.id })
    .from(activities)
    .where(and(gte(activities.day, m.start), lte(activities.day, m.end), eq(activities.void, false), eq(activities.memorable, true)));
  const monthSched = await scheduledEvents(localToUtc(m.start, "00:00"), localToUtc(addDays(m.end, 1), "00:00"), now, ["memorable"]);

  return [
    { id: "ceo_blocks", target: t.work.ceoBlocks, done: count((a) => a.typeId === "ceo_block"), scheduled: schedCount(["ceo_block"]) },
    { id: "operating_review", target: t.work.opReview, done: count((a) => a.typeId === "operating_review"), scheduled: schedCount(["operating_review"]) },
    {
      id: "sessions",
      target: t.body.sessions,
      done: sessions.length,
      scheduled: schedCount(["training"]),
      cardioDone: cardio,
      strengthDone: strength,
      cardioTarget: t.body.cardio,
      strengthTarget: t.body.strength,
    },
    { id: "meals", target: 5, done: consistentDays, scheduled: 0 },
    { id: "bedtime", target: 5, done: nightsIn, scheduled: 0, nightsWithData },
    { id: "friend_plans", target: t.relationships.friendPlans, done: count((a) => a.typeId === "friend_plan"), scheduled: schedCount(["friend_plan"]) },
    { id: "family_touchpoint", target: t.relationships.familyTouch, done: count((a) => a.typeId === "family_touchpoint"), scheduled: schedCount(["family_touchpoint"]) },
    { id: "enjoyable", target: t.aliveness.enjoyable, done: count((a) => ENJOYABLE_TYPES.includes(a.typeId) && (a.rating === null || a.rating >= 4)), scheduled: schedCount(["enjoyable", "gig", "nature", "memorable"]) },
    { id: "memorable", target: t.aliveness.memorablePerMonth, done: monthActs.length, scheduled: monthSched.length },
  ];
}

/**
 * Busy intervals for the slot finder: timed, non-declined events across the read calendars. All-day events
 * (trips, tournaments, reminders) don't block slots, and neither do events whose title says they're cancelled.
 */
export async function busyIntervals(from: Date, to: Date): Promise<Array<{ start: Date; end: Date }>> {
  const rows = await db
    .select({ start: calendarEvents.start, end: calendarEvents.end })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.deleted, false),
        eq(calendarEvents.allDay, false),
        gte(calendarEvents.end, from),
        lte(calendarEvents.start, to),
        or(sql`${calendarEvents.selfResponse} is null`, sql`${calendarEvents.selfResponse} <> 'declined'`),
        sql`${calendarEvents.title} !~* '^\s*cancel+ed\b'`,
      ),
    );
  return rows;
}

export async function lastNightSleep(todayKey: DayKey) {
  const [row] = await db
    .select()
    .from(whoopSleeps)
    .where(and(eq(whoopSleeps.nap, false), lte(whoopSleeps.day, todayKey)))
    .orderBy(sql`${whoopSleeps.end} desc`)
    .limit(1);
  return row ?? null;
}
