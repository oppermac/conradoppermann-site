/** Data for the Week page: 7-day strip, behaviour checklists with evidence, cups, rocks, nudge history. */
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, hasDb } from "../db/client";
import { activities, calendarEvents, checkins, insights, whoopWorkouts } from "../db/schema";
import { CUP_META } from "../domain/activity-types";
import { computeGapsAndSuggestions } from "../domain/engine";
import { weekFacts, weekWindow } from "../domain/facts";
import { BEHAVIOUR_META, ragAtEnd, ringProgress, worstRag, type Rag } from "../domain/kpis";
import { DOMAINS, DOMAIN_META, programmePosition, type Domain } from "../domain/programme";
import { readRoadmap } from "../monday/sync";
import { getSettings, DEFAULT_SETTINGS } from "../settings";
import { addDays, dayRange, dublin, formatDayShort, weekKey, type DayKey } from "../time";

export async function weekData(anyDay?: DayKey, nowDate = new Date()) {
  const now = dublin(nowDate);
  const dayKey = anyDay ?? now.dayKey;
  const w = weekWindow(dayKey);
  const days = dayRange(w.start, w.end);
  const pos = programmePosition(dayKey);
  const isCurrent = w.start <= now.dayKey && now.dayKey <= w.end;
  const label = `${formatDayShort(w.start).replace(/^\w+ /, "")} – ${formatDayShort(w.end).replace(/^\w+ /, "")}`;
  if (!hasDb) return { dbConnected: false as const, weekStart: w.start, weekEnd: w.end, label, programme: pos, days, settings: DEFAULT_SETTINGS };

  const { settings } = await getSettings();
  const factsNow = isCurrent ? nowDate : new Date(w.endAt.getTime() - 1);
  const [facts, engine, acts, events, workouts, nights, nudges, roadmap] = await Promise.all([
    weekFacts(dayKey, settings, factsNow),
    isCurrent ? computeGapsAndSuggestions(nowDate) : Promise.resolve(null),
    db.select().from(activities).where(and(gte(activities.day, w.start), lte(activities.day, w.end), eq(activities.void, false))),
    db.select().from(calendarEvents).where(and(eq(calendarEvents.deleted, false), gte(calendarEvents.end, w.startAt), lte(calendarEvents.start, w.endAt))).orderBy(calendarEvents.start),
    db.select().from(whoopWorkouts).where(and(gte(whoopWorkouts.day, w.start), lte(whoopWorkouts.day, w.end))),
    db.select().from(checkins).where(and(gte(checkins.day, w.start), lte(checkins.day, w.end))),
    db.select().from(insights).where(and(eq(insights.kind, "nudge"), gte(insights.forDate, w.start), lte(insights.forDate, w.end))).orderBy(desc(insights.createdAt)),
    readRoadmap().catch(() => null),
  ]);

  const strip = days.map((d) => {
    const dayActs = acts.filter((a) => a.day === d);
    const dayEvents = events.filter((e) => dublin(e.start).dayKey === d && e.selfResponse !== "declined");
    const touched = new Set<Domain>();
    const scheduled = new Set<Domain>();
    for (const a of dayActs) if (DOMAINS.includes(a.domain as Domain)) touched.add(a.domain as Domain);
    for (const e of dayEvents) {
      if (!e.domain || !DOMAINS.includes(e.domain as Domain)) continue;
      if (e.end > nowDate) scheduled.add(e.domain as Domain);
      else touched.add(e.domain as Domain);
    }
    const night = nights.find((n) => n.day === d);
    return { day: d, label: formatDayShort(d).slice(0, 3), date: Number(d.slice(8)), isToday: d === now.dayKey, isPast: d < now.dayKey, touched: Array.from(touched), scheduled: Array.from(scheduled), sleep: night?.bedtimeStatus ?? (night?.bedtimeLocal ? "in" : null), workouts: workouts.filter((x) => x.day === d && x.countsAsSession).length };
  });

  const evidenceFor = (id: string): string[] => {
    const byType = (types: string[]) => acts.filter((a) => types.includes(a.typeId)).map((a) => `${formatDayShort(a.day).slice(0, 3)} ${a.title}${a.durationMin ? ` (${a.durationMin} min)` : ""}`);
    const sched = (kinds: string[]) => events.filter((e) => e.kind && kinds.includes(e.kind) && e.end > nowDate).map((e) => `${formatDayShort(dublin(e.start).dayKey).slice(0, 3)} ${dublin(e.start).hhmm} ${e.title} · scheduled`);
    switch (id) {
      case "ceo_blocks": return [...byType(["ceo_block"]), ...sched(["ceo_block"])];
      case "operating_review": return [...byType(["operating_review"]), ...sched(["operating_review"])];
      case "sessions": return [...byType(["cardio", "strength", "mixed", "team_sport"]), ...sched(["training"])];
      case "friend_plans": return [...byType(["friend_plan"]), ...sched(["friend_plan"])];
      case "family_touchpoint": return [...byType(["family_touchpoint"]), ...sched(["family_touchpoint"])];
      case "enjoyable": return [...byType(["enjoyable", "gig", "nature", "laughter", "memorable"]), ...sched(["enjoyable", "gig", "nature", "memorable"])];
      case "memorable": return acts.filter((a) => a.memorable).map((a) => a.title);
      case "bedtime": return nights.filter((n) => n.bedtimeLocal).map((n) => `${formatDayShort(n.day).slice(0, 3)} ${n.bedtimeLocal} · ${n.bedtimeStatus}`);
      default: return [];
    }
  };

  const domains = DOMAINS.map((d) => {
    const fs = facts.filter((f) => BEHAVIOUR_META[f.id].domain === d);
    const weekly = fs.filter((f) => BEHAVIOUR_META[f.id].period === "week");
    const rag: Rag = worstRag(weekly.map(ragAtEnd));
    return {
      domain: d,
      label: DOMAIN_META[d].label,
      progress: ringProgress(weekly),
      rag,
      behaviours: fs.map((f) => ({ id: f.id, label: BEHAVIOUR_META[f.id].label, period: BEHAVIOUR_META[f.id].period, done: f.done, scheduled: f.scheduled, target: f.target, rag: ragAtEnd(f), cardioDone: f.cardioDone, strengthDone: f.strengthDone, evidence: evidenceFor(f.id).slice(0, 6) })),
    };
  });

  return {
    dbConnected: true as const,
    weekStart: w.start,
    weekEnd: w.end,
    weekKey: weekKey(dayKey),
    label,
    programme: pos,
    isCurrent,
    prevWeek: addDays(w.start, -7),
    nextWeek: addDays(w.start, 7),
    days: strip,
    domains,
    gaps: engine?.gaps ?? [],
    suggestions: (engine?.suggestions ?? []).map((s) => ({ ...s, slots: s.slots.map((x) => ({ ...x, start: x.start.toISOString(), end: x.end.toISOString() })) })),
    cups: engine ? engine.cups.map((c) => ({ ...c, label: CUP_META[c.cup].label, short: CUP_META[c.cup].short, low: engine.lowCups.includes(c.cup) })) : [],
    rocks: roadmap ? { fetchedAt: roadmap.fetchedAt.toISOString(), summary: roadmap.summary, stuck: roadmap.items.filter((i) => i.status === "Stuck"), inProgress: roadmap.items.filter((i) => i.status === "In Progress") } : null,
    nudges: nudges.map((n) => ({ id: n.id, title: n.title, body: n.bodyMd, createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() ?? null })),
    settings,
  };
}

export type WeekData = Awaited<ReturnType<typeof weekData>>;
