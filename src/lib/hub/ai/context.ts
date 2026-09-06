/**
 * buildContext(): the single compact "state of Conrad" JSON that feeds the brief, the review, the nudges,
 * the coach and GET /hub/api/state. Target ≤ ~3k tokens — lists are capped.
 */
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { activities, calendarEvents, checkins, insights, medicationLog, whoopCycles, whoopRecoveries, whoopWorkouts } from "../db/schema";
import { DOMAIN_META, programmePosition } from "../domain/programme";
import { BEHAVIOUR_META, ragAtEnd, ringProgress, worstRag, type BehaviourFacts } from "../domain/kpis";
import { computeGapsAndSuggestions } from "../domain/engine";
import { lastNightSleep, weekFacts, weekWindow } from "../domain/facts";
import { peopleDue } from "../domain/engine";
import { dailyTotals, totalsForDays, isConsistentDay } from "../meals/store";
import { readRoadmap } from "../monday/sync";
import { getSettings } from "../settings";
import { addDays, dayRange, dublin, localToUtc, weekKey, type DayKey } from "../time";
import { CUP_META } from "../domain/activity-types";

const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const hm = (d: Date) => dublin(d).hhmm;

async function eventsOn(day: DayKey) {
  const from = localToUtc(day, "00:00");
  const to = localToUtc(addDays(day, 1), "00:00");
  const rows = await db
    .select({ title: calendarEvents.title, start: calendarEvents.start, end: calendarEvents.end, allDay: calendarEvents.allDay, domain: calendarEvents.domain, kind: calendarEvents.kind, attendees: calendarEvents.attendeesCount, self: calendarEvents.selfResponse })
    .from(calendarEvents)
    .where(and(eq(calendarEvents.deleted, false), gte(calendarEvents.end, from), lte(calendarEvents.start, to)))
    .orderBy(calendarEvents.start)
    .limit(25);
  return rows
    .filter((e) => e.self !== "declined")
    .map((e) => ({
      time: e.allDay ? "all day" : `${hm(e.start)}–${hm(e.end)}`,
      title: short(e.title),
      domain: e.domain ?? "unclassified",
      kind: e.kind ?? undefined,
      people: e.attendees > 1 ? e.attendees : undefined,
    }));
}

export async function buildContext(nowDate = new Date()) {
  const now = dublin(nowDate);
  const { settings } = await getSettings();
  const pos = programmePosition(now.dayKey);
  const w = weekWindow(now.dayKey);
  const wk = weekKey(now.dayKey);

  const [facts, engine, todayEvents, tomorrowEvents, sleep, recovery, cycles, workouts, mealsToday, last7, checks, roadmap, recentInsights, meds, people] =
    await Promise.all([
      weekFacts(now.dayKey, settings, nowDate),
      computeGapsAndSuggestions(nowDate),
      eventsOn(now.dayKey),
      eventsOn(addDays(now.dayKey, 1)),
      lastNightSleep(now.dayKey),
      db.select().from(whoopRecoveries).orderBy(desc(whoopRecoveries.day)).limit(1).then((r) => r[0] ?? null),
      db.select().from(whoopCycles).orderBy(desc(whoopCycles.start)).limit(2),
      db.select().from(whoopWorkouts).where(and(gte(whoopWorkouts.start, w.startAt), lte(whoopWorkouts.start, w.endAt))).orderBy(whoopWorkouts.start),
      dailyTotals(now.dayKey),
      totalsForDays(dayRange(addDays(now.dayKey, -6), now.dayKey)),
      db.select().from(checkins).where(gte(checkins.day, addDays(now.dayKey, -6))).orderBy(desc(checkins.day)),
      readRoadmap().catch(() => null),
      db.select({ kind: insights.kind, forDate: insights.forDate, title: insights.title }).from(insights).orderBy(desc(insights.createdAt)).limit(5),
      db.select({ name: medicationLog.name, takenAt: medicationLog.takenAt }).from(medicationLog).where(eq(medicationLog.day, now.dayKey)),
      peopleDue(now.dayKey),
    ]);

  const byDomain = (d: string) => facts.filter((f) => BEHAVIOUR_META[f.id].domain === d && BEHAVIOUR_META[f.id].period === "week");
  const domains = Object.fromEntries(
    (Object.keys(DOMAIN_META) as Array<keyof typeof DOMAIN_META>).map((d) => [
      d,
      {
        ring: Math.round(ringProgress(byDomain(d)) * 100),
        rag: worstRag(byDomain(d).map(ragAtEnd)),
        behaviours: byDomain(d).map((f: BehaviourFacts) => ({ id: f.id, done: f.done, scheduled: f.scheduled, target: f.target })),
      },
    ]),
  );

  const recentActivities = await db
    .select({ day: activities.day, title: activities.title, typeId: activities.typeId, people: activities.people, rating: activities.rating, memorable: activities.memorable })
    .from(activities)
    .where(and(gte(activities.day, addDays(now.dayKey, -13)), eq(activities.void, false), sql`${activities.domain} in ('relationships','aliveness')`))
    .orderBy(desc(activities.day))
    .limit(12);

  return {
    now: { local: `${now.dayKey} ${now.hhmm}`, weekday: ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][now.weekday], weekKey: wk },
    programme: { day: pos.day, ofDays: pos.ofDays, week: pos.week, ofWeeks: pos.ofWeeks, daysLeft: pos.daysLeft },
    targets: settings.targets,
    quietWeek: settings.notifications.quietWeek,
    calendar: { today: todayEvents, tomorrow: tomorrowEvents },
    whoop: {
      lastSleep: sleep
        ? {
            bedtime: sleep.bedtimeLocal,
            wake: sleep.wakeLocal,
            hours: sleep.inBedMs ? Math.round(((sleep.inBedMs - (sleep.awakeMs ?? 0)) / 3600000) * 10) / 10 : null,
            performance: sleep.perfPct,
            consistency: sleep.consistencyPct,
            state: sleep.scoreState,
          }
        : null,
      recovery: recovery ? { day: recovery.day, score: recovery.recoveryScore, hrv: recovery.hrv, rhr: recovery.rhr, state: recovery.scoreState } : null,
      strain: cycles.map((c) => ({ day: c.day, strain: c.strain, inProgress: c.end === null })),
      workoutsThisWeek: workouts.map((x) => ({ day: x.day, sport: x.sportName, kind: x.kind, minutes: x.durationMin, strain: x.strain, counts: x.countsAsSession })),
    },
    domains,
    gaps: engine.gaps.map((g) => ({ id: g.id, needs: g.needs, done: g.done, scheduled: g.scheduled, target: g.target, risk: g.risk })),
    suggestions: engine.suggestions.slice(0, 4).map((s) => ({ title: s.title, reason: s.reason, person: s.person?.name, slots: s.slots.slice(0, 2).map((x) => x.label) })),
    cups: engine.cups.map((c) => ({ cup: CUP_META[c.cup].label, drops: c.drops, capacity: c.capacity, low: engine.lowCups.includes(c.cup) })),
    people: people
      .filter((p) => p.overdueDays >= 0)
      .sort((a, b) => b.overdueDays - a.overdueDays)
      .slice(0, 5)
      .map((p) => ({ name: p.name, relationship: p.relationship, daysSince: p.daysSince, cadence: p.cadenceDays })),
    meals: {
      today: { ...mealsToday, targets: { kcal: settings.nutrition.kcal, proteinG: settings.nutrition.proteinG, carbsG: settings.nutrition.carbsG, fatG: settings.nutrition.fatG } },
      last7: last7.map((d) => ({ day: d.day, kcal: d.kcal, protein: Math.round(d.proteinG), meals: d.meals, consistent: isConsistentDay(d, settings.nutrition) })),
    },
    sleepWindow: { start: settings.sleep.bedtimeStart, end: settings.sleep.bedtimeEnd },
    checkins: checks.map((c) => ({ day: c.day, bedtime: c.bedtimeLocal, bedtimeStatus: c.bedtimeStatus, mood: c.mood, energy: c.energy, gratitude: c.gratitude ? short(c.gratitude, 80) : undefined })),
    medicationToday: meds.map((m) => m.name),
    recent: recentActivities.map((a) => ({ day: a.day, what: short(a.title, 40), type: a.typeId, people: a.people ?? undefined, rating: a.rating ?? undefined, memorable: a.memorable || undefined })),
    work: roadmap
      ? {
          fetchedAt: roadmap.fetchedAt,
          rocks: roadmap.summary.rocks,
          goals: roadmap.summary.goals,
          stuck: roadmap.items.filter((i) => i.status === "Stuck").map((i) => i.name).slice(0, 5),
          inProgress: roadmap.items.filter((i) => i.status === "In Progress").map((i) => i.name).slice(0, 5),
        }
      : null,
    recentInsights,
  };
}

export type HubContext = Awaited<ReturnType<typeof buildContext>>;
