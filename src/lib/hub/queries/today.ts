/** Data for the Today page. Everything here is plain JSON so it can cross to client components. */
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, hasDb } from "../db/client";
import { activities, calendarEvents, insights, whoopCycles, whoopRecoveries, whoopWorkouts } from "../db/schema";
import { CUP_META } from "../domain/activity-types";
import { computeGapsAndSuggestions } from "../domain/engine";
import { lastNightSleep, weekFacts } from "../domain/facts";
import { BEHAVIOUR_META, ragAtEnd, ringProgress, worstRag, type BehaviourFacts, type Rag } from "../domain/kpis";
import { DOMAINS, DOMAIN_META, programmePosition, type Domain } from "../domain/programme";
import { dailyTotals, mealsForDay, recentMeals } from "../meals/store";
import { getSettings, DEFAULT_SETTINGS } from "../settings";
import { addDays, bedtimeStatus, dublin, formatDayLong, localToUtc } from "../time";

export type TimelineItem = {
  id: string;
  kind: "event" | "workout" | "meal" | "sleep" | "activity";
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay?: boolean;
  domain?: string | null;
  eventKind?: string | null;
  calendarId?: string;
  meta?: string;
  thumb?: string | null;
};

export type RingData = { domain: Domain; label: string; progress: number; rag: Rag; summary: string; behaviours: Array<{ id: BehaviourFacts["id"]; label: string; done: number; scheduled: number; target: number }> };

function behaviourSummary(facts: BehaviourFacts[]): string {
  return facts
    .map((f) => {
      const meta = BEHAVIOUR_META[f.id];
      if (f.id === "sessions") return `${f.done}/${f.target} sessions`;
      if (f.id === "ceo_blocks") return `${f.done}/${f.target} blocks`;
      if (f.id === "meals") return `${f.done}/5 meal days`;
      if (f.id === "bedtime") return `${f.done}/5 nights`;
      return `${f.done}/${f.target} ${meta.unit}`;
    })
    .join(" · ");
}

export async function todayData(nowDate = new Date()) {
  const now = dublin(nowDate);
  const eyebrow = formatDayLong(now.dayKey).toUpperCase();
  const pos = programmePosition(now.dayKey);
  if (!hasDb) {
    return { dbConnected: false as const, dayKey: now.dayKey, eyebrow, programme: pos, settings: DEFAULT_SETTINGS };
  }
  const { settings } = await getSettings();
  const dayStart = localToUtc(now.dayKey, "00:00");
  const dayEnd = localToUtc(addDays(now.dayKey, 1), "00:00");

  const [facts, engine, events, workouts, acts, sleep, recovery, cycle, brief, nudges, totals, meals, recent] = await Promise.all([
    weekFacts(now.dayKey, settings, nowDate),
    computeGapsAndSuggestions(nowDate),
    db.select().from(calendarEvents).where(and(eq(calendarEvents.deleted, false), gte(calendarEvents.end, dayStart), lte(calendarEvents.start, dayEnd))).orderBy(calendarEvents.start),
    db.select().from(whoopWorkouts).where(and(gte(whoopWorkouts.start, dayStart), lte(whoopWorkouts.start, dayEnd))).orderBy(whoopWorkouts.start),
    db.select().from(activities).where(and(eq(activities.day, now.dayKey), eq(activities.void, false), eq(activities.source, "manual"))).orderBy(activities.occurredAt),
    lastNightSleep(now.dayKey),
    db.select().from(whoopRecoveries).orderBy(desc(whoopRecoveries.day)).limit(1).then((r) => r[0] ?? null),
    db.select().from(whoopCycles).orderBy(desc(whoopCycles.start)).limit(1).then((r) => r[0] ?? null),
    db.select().from(insights).where(and(eq(insights.kind, "brief"), eq(insights.forDate, now.dayKey))).orderBy(desc(insights.createdAt)).limit(1).then((r) => r[0] ?? null),
    db.select().from(insights).where(and(eq(insights.kind, "nudge"), gte(insights.forDate, addDays(now.dayKey, -1)))).orderBy(desc(insights.createdAt)).limit(5),
    dailyTotals(now.dayKey),
    mealsForDay(now.dayKey),
    recentMeals(8),
  ]);

  const rings: RingData[] = DOMAINS.map((d) => {
    const fs = facts.filter((f) => BEHAVIOUR_META[f.id].domain === d && BEHAVIOUR_META[f.id].period === "week");
    return {
      domain: d,
      label: DOMAIN_META[d].label,
      progress: ringProgress(fs),
      rag: worstRag(fs.map(ragAtEnd)),
      summary: behaviourSummary(fs),
      behaviours: fs.map((f) => ({ id: f.id, label: BEHAVIOUR_META[f.id].label, done: f.done, scheduled: f.scheduled, target: f.target })),
    };
  });

  const timeline: TimelineItem[] = [
    ...(sleep && sleep.end >= dayStart
      ? [{ id: `sleep:${sleep.id}`, kind: "sleep" as const, title: `Slept ${sleep.bedtimeLocal}–${sleep.wakeLocal}`, start: sleep.start.toISOString(), end: sleep.end.toISOString(), meta: sleep.perfPct ? `${Math.round(sleep.perfPct)}% performance` : undefined }]
      : []),
    ...events
      .filter((e) => e.selfResponse !== "declined")
      .map((e) => ({ id: `event:${e.calendarId}:${e.id}`, kind: "event" as const, title: e.title || "(untitled)", start: e.start.toISOString(), end: e.end.toISOString(), allDay: e.allDay, domain: e.domain, eventKind: e.kind, calendarId: e.calendarId, meta: e.attendeesCount > 1 ? `${e.attendeesCount} people` : undefined })),
    ...workouts.map((w) => ({ id: `workout:${w.id}`, kind: "workout" as const, title: w.sportName ?? "Workout", start: w.start.toISOString(), end: w.end.toISOString(), domain: "body", meta: `${w.durationMin} min${w.strain ? ` · strain ${w.strain.toFixed(1)}` : ""}` })),
    ...meals.map((m) => ({ id: `meal:${m.id}`, kind: "meal" as const, title: m.name, start: m.eatenAt.toISOString(), end: new Date(m.eatenAt.getTime() + 30 * 60000).toISOString(), domain: "body", meta: `${m.kcal} kcal`, thumb: m.photoUrl })),
    ...acts.map((a) => ({ id: `activity:${a.id}`, kind: "activity" as const, title: a.title, start: a.occurredAt.toISOString(), end: new Date(a.occurredAt.getTime() + (a.durationMin ?? 30) * 60000).toISOString(), domain: a.domain, eventKind: a.kind })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const upcoming = timeline.find((t) => t.kind === "event" && !t.allDay && new Date(t.start) > nowDate);
  const nextUp = upcoming ? { title: upcoming.title, start: upcoming.start, inMinutes: Math.round((new Date(upcoming.start).getTime() - nowDate.getTime()) / 60000) } : null;

  const bedtimeWindow = { start: settings.sleep.bedtimeStart, end: settings.sleep.bedtimeEnd, graceMin: settings.sleep.graceMin };
  return {
    dbConnected: true as const,
    dayKey: now.dayKey,
    eyebrow,
    programme: pos,
    settings,
    brief: brief ? { id: brief.id, title: brief.title, bodyMd: brief.bodyMd, payload: brief.payload as { brief?: { top3?: Array<{ domain: string; action: string; when: string }>; watchouts?: string[] } } | null, readAt: brief.readAt?.toISOString() ?? null } : null,
    gaps: engine.gaps,
    suggestions: engine.suggestions.map((s) => ({ ...s, slots: s.slots.map((x) => ({ ...x, start: x.start.toISOString(), end: x.end.toISOString() })) })),
    cups: engine.cups.map((c) => ({ ...c, label: CUP_META[c.cup].label, short: CUP_META[c.cup].short, low: engine.lowCups.includes(c.cup) })),
    rings,
    timeline,
    nextUp,
    body: {
      recovery: recovery ? { day: recovery.day, score: recovery.recoveryScore, hrv: recovery.hrv, rhr: recovery.rhr, state: recovery.scoreState } : null,
      sleep: sleep
        ? { bedtime: sleep.bedtimeLocal, wake: sleep.wakeLocal, hours: sleep.inBedMs ? Math.round(((sleep.inBedMs - (sleep.awakeMs ?? 0)) / 3600000) * 10) / 10 : null, performance: sleep.perfPct, consistency: sleep.consistencyPct, status: sleep.bedtimeLocal ? bedtimeStatus(sleep.bedtimeLocal, bedtimeWindow) : null, state: sleep.scoreState }
        : null,
      strain: cycle ? { day: cycle.day, value: cycle.strain, inProgress: cycle.end === null, state: cycle.scoreState } : null,
      bedtimeWindow,
    },
    food: { totals, targets: settings.nutrition, meals: meals.map((m) => ({ id: m.id, name: m.name, slot: m.slot, kcal: m.kcal, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG, photoUrl: m.photoUrl, eatenAt: m.eatenAt.toISOString() })), recent },
    nudges: nudges.map((n) => ({ id: n.id, title: n.title, body: n.bodyMd, createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() ?? null })),
  };
}

export type TodayData = Awaited<ReturnType<typeof todayData>>;
