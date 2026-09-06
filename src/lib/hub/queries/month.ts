/**
 * Data for the Month page: a day-by-day heatmap, monthly targets, cup aggregates, 12-week trends and a
 * teaser of the programme grid. Everything here is plain JSON so it can cross to client components.
 */
import { and, eq, gte, lte } from "drizzle-orm";
import { db, hasDb } from "../db/client";
import { activities, calendarEvents, checkins, whoopRecoveries, whoopSleeps } from "../db/schema";
import { monthCupFills } from "../domain/cups";
import { weekFacts } from "../domain/facts";
import { BEHAVIOUR_META, ragAtEnd, weekFullyGreen, worstRag, type BehaviourFacts } from "../domain/kpis";
import { DOMAINS, DOMAIN_META, PROGRAMME_WEEK_1_START, type Domain } from "../domain/programme";
import { DEFAULT_SETTINGS, getSettings } from "../settings";
import {
  addDays,
  dayRange,
  dublin,
  formatDayShort,
  localToUtc,
  minutesFrom18,
  monthRange,
  weekKey,
  weekStart,
  type DayKey,
  type MonthKey,
} from "../time";

export type MonthDay = {
  day: number;
  dayKey: DayKey;
  domainsTouched: number;
  recovery: number | null;
  sleep: "in" | "late" | "early" | null;
  isToday: boolean;
  isFuture: boolean;
};

export type MonthTrendWeek = {
  weekKey: string;
  label: string;
  meanRecovery: number | null;
  meanSleepConsistency: number | null;
  meanRhr: number | null;
  bedtimeStdDevMin: number | null;
  meanWeightKg: number | null;
};

export type ProgrammeGridRow = {
  domain: Domain;
  label: string;
  months: Array<{ monthKey: MonthKey; label: string; weeksOnTrack: number; weeksElapsed: number }>;
};

/** The one-off Sep–Dec 2026 programme; see domain/programme.ts. */
const PROGRAMME_MONTHS: Array<{ monthKey: MonthKey; label: string }> = [
  { monthKey: "2026-09", label: "Sep" },
  { monthKey: "2026-10", label: "Oct" },
  { monthKey: "2026-11", label: "Nov" },
  { monthKey: "2026-12", label: "Dec" },
];
const PROGRAMME_WEEK_COUNT = 18;

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function monthLabelOf(mk: MonthKey): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(`${mk}-01T00:00:00Z`));
}

export async function monthData(monthKeyInput?: MonthKey) {
  const now = new Date();
  const today = dublin(now).dayKey;
  const mk: MonthKey = monthKeyInput ?? today.slice(0, 7);
  const label = monthLabelOf(mk);

  if (!hasDb) {
    return { dbConnected: false as const, monthKey: mk, label, settings: DEFAULT_SETTINGS };
  }

  const { settings } = await getSettings();
  const { start, end } = monthRange(mk);
  const days = dayRange(start, end);
  const monthStartAt = localToUtc(start, "00:00");
  const monthEndAt = localToUtc(addDays(end, 1), "00:00");

  const [acts, events, recoveries, nights, memorableRows] = await Promise.all([
    db
      .select({ day: activities.day, domain: activities.domain })
      .from(activities)
      .where(and(gte(activities.day, start), lte(activities.day, end), eq(activities.void, false))),
    db
      .select({ start: calendarEvents.start, end: calendarEvents.end, domain: calendarEvents.domain, selfResponse: calendarEvents.selfResponse })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.deleted, false), gte(calendarEvents.end, monthStartAt), lte(calendarEvents.start, monthEndAt))),
    db
      .select({ day: whoopRecoveries.day, score: whoopRecoveries.recoveryScore })
      .from(whoopRecoveries)
      .where(and(gte(whoopRecoveries.day, start), lte(whoopRecoveries.day, end))),
    db
      .select({ day: checkins.day, status: checkins.bedtimeStatus, bedtime: checkins.bedtimeLocal })
      .from(checkins)
      .where(and(gte(checkins.day, start), lte(checkins.day, end))),
    db
      .select({ title: activities.title, day: activities.day })
      .from(activities)
      .where(and(gte(activities.day, start), lte(activities.day, end), eq(activities.void, false), eq(activities.memorable, true))),
  ]);

  const monthDays: MonthDay[] = days.map((d) => {
    const touched = new Set<string>();
    for (const a of acts) if (a.day === d && a.domain && DOMAINS.includes(a.domain as Domain)) touched.add(a.domain);
    for (const e of events) {
      if (e.selfResponse === "declined" || !e.domain || !DOMAINS.includes(e.domain as Domain)) continue;
      if (e.end > now) continue; // only events that have already happened count as "touched"
      if (dublin(e.start).dayKey === d) touched.add(e.domain);
    }
    const recovery = recoveries.find((r) => r.day === d)?.score ?? null;
    const night = nights.find((n) => n.day === d);
    return {
      day: Number(d.slice(8)),
      dayKey: d,
      domainsTouched: Math.min(4, touched.size),
      recovery,
      sleep: night?.bedtime ? (night.status ?? null) : null,
      isToday: d === today,
      isFuture: d > today,
    };
  });

  const memorable = memorableRows.map((r) => ({ title: r.title, day: Number(r.day.slice(8)) }));

  // Weeks fully green: only ISO weeks touching this month that have already ended.
  const weekKeysInMonth = Array.from(new Set(days.map((d) => weekKey(d))));
  let weeksFullyGreen = 0;
  for (const wk of weekKeysInMonth) {
    const anyDayInWeek = days.find((d) => weekKey(d) === wk)!;
    const monday = weekStart(anyDayInWeek);
    const weekEndAt = localToUtc(addDays(monday, 7), "00:00");
    if (weekEndAt > now) continue;
    const facts = await weekFacts(monday, settings, new Date(weekEndAt.getTime() - 1));
    if (weekFullyGreen(facts)) weeksFullyGreen += 1;
  }

  // 12-week rolling trends, ending with the week containing "now" (independent of the viewed month).
  const currentMonday = weekStart(today);
  const trendMondays: DayKey[] = [];
  for (let i = 11; i >= 0; i--) trendMondays.push(addDays(currentMonday, -7 * i));
  const trendStart = trendMondays[0];
  const trendEnd = addDays(currentMonday, 6);
  const [trendRecoveries, trendSleeps, trendCheckins] = await Promise.all([
    db
      .select({ day: whoopRecoveries.day, score: whoopRecoveries.recoveryScore, rhr: whoopRecoveries.rhr })
      .from(whoopRecoveries)
      .where(and(gte(whoopRecoveries.day, trendStart), lte(whoopRecoveries.day, trendEnd))),
    db
      .select({ day: whoopSleeps.day, consistency: whoopSleeps.consistencyPct })
      .from(whoopSleeps)
      .where(and(eq(whoopSleeps.nap, false), gte(whoopSleeps.day, trendStart), lte(whoopSleeps.day, trendEnd))),
    db
      .select({ day: checkins.day, bedtime: checkins.bedtimeLocal, weightKg: checkins.weightKg })
      .from(checkins)
      .where(and(gte(checkins.day, trendStart), lte(checkins.day, trendEnd))),
  ]);

  const trendWeeks: MonthTrendWeek[] = trendMondays.map((monday) => {
    const sunday = addDays(monday, 6);
    const inWeek = (d: string) => d >= monday && d <= sunday;
    const recoveryVals = trendRecoveries.filter((r) => inWeek(r.day) && r.score !== null).map((r) => r.score as number);
    const rhrVals = trendRecoveries.filter((r) => inWeek(r.day) && r.rhr !== null).map((r) => r.rhr as number);
    const sleepVals = trendSleeps.filter((s) => inWeek(s.day) && s.consistency !== null).map((s) => s.consistency as number);
    const bedtimeVals = trendCheckins.filter((c) => inWeek(c.day) && c.bedtime).map((c) => minutesFrom18(c.bedtime as string));
    const weightVals = trendCheckins.filter((c) => inWeek(c.day) && c.weightKg !== null).map((c) => c.weightKg as number);
    return {
      weekKey: weekKey(monday),
      label: `${formatDayShort(monday).replace(/^\w+ /, "")}–${formatDayShort(sunday).replace(/^\w+ /, "")}`,
      meanRecovery: mean(recoveryVals),
      meanSleepConsistency: mean(sleepVals),
      meanRhr: mean(rhrVals),
      bedtimeStdDevMin: stdDev(bedtimeVals),
      meanWeightKg: mean(weightVals),
    };
  });
  const latestWeightRow = trendCheckins.filter((c) => c.weightKg !== null).sort((a, b) => (a.day < b.day ? 1 : -1))[0];
  const latestWeight = latestWeightRow?.weightKg ?? settings.nutrition.weightKg ?? null;

  // Programme grid teaser: weeks on track / elapsed per domain, bucketed by the calendar month of each
  // week's Monday. Weeks that haven't ended yet are skipped entirely (no query, no contribution).
  const programmeMondays: DayKey[] = [];
  for (let i = 0; i < PROGRAMME_WEEK_COUNT; i++) programmeMondays.push(addDays(PROGRAMME_WEEK_1_START, i * 7));
  const factsByMonday = new Map<DayKey, BehaviourFacts[]>();
  for (const monday of programmeMondays) {
    const weekEndAt = localToUtc(addDays(monday, 7), "00:00");
    if (weekEndAt > now) continue;
    factsByMonday.set(monday, await weekFacts(monday, settings, new Date(weekEndAt.getTime() - 1)));
  }
  const programmeGrid: ProgrammeGridRow[] = DOMAINS.map((d) => ({
    domain: d,
    label: DOMAIN_META[d].label,
    months: PROGRAMME_MONTHS.map(({ monthKey: pmk, label: pLabel }) => {
      let onTrack = 0;
      let elapsed = 0;
      for (const monday of programmeMondays) {
        if (monday.slice(0, 7) !== pmk) continue;
        const facts = factsByMonday.get(monday);
        if (!facts) continue;
        elapsed += 1;
        const domainFacts = facts.filter((f) => BEHAVIOUR_META[f.id].domain === d && BEHAVIOUR_META[f.id].period === "week");
        if (domainFacts.length && worstRag(domainFacts.map(ragAtEnd)) === "green") onTrack += 1;
      }
      return { monthKey: pmk, label: pLabel, weeksOnTrack: onTrack, weeksElapsed: elapsed };
    }),
  }));

  return {
    dbConnected: true as const,
    monthKey: mk,
    label,
    today,
    settings,
    days: monthDays,
    memorable,
    weeksFullyGreen,
    weeksTotal: weekKeysInMonth.length,
    cups: await monthCupFills(mk, settings.cups.capacity),
    trends: { weeks: trendWeeks, latestWeight },
    programmeGrid,
  };
}

export type MonthData = Awaited<ReturnType<typeof monthData>>;
