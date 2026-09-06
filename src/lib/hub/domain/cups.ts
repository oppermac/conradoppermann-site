/**
 * Cups evaluator: turns the week's activities, sleeps and meal days into neuro_drops rows (idempotent via
 * the (source_type, source_id, cup) unique index) and reads back fill levels.
 */
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { activities, checkins, neuroDrops, whoopSleeps } from "../db/schema";
import { isConsistentDay, totalsForDays } from "../meals/store";
import type { Settings } from "../settings";
import { dayRange, weekKey as toWeekKey, weekRange, type WeekKey } from "../time";
import { ACTIVITY_TYPE_BY_ID, CUPS, dropsFor, type Cup, type Drops } from "./activity-types";
import { weekWindow } from "./facts";

export type CupFill = { cup: Cup; drops: number; capacity: number; fill: number };

type Candidate = { sourceType: string; sourceId: string; typeId: string; day: string; at: number; drops: Drops };

export async function evaluateCupsForWeek(wk: WeekKey, settings: Settings): Promise<{ written: number; removed: number }> {
  const { start, end } = weekRange(wk);
  const w = weekWindow(start);
  const overrides = settings.cups.weightOverrides as Record<string, Drops>;
  const caps = settings.cups.caps;
  const candidates: Candidate[] = [];

  const acts = await db
    .select()
    .from(activities)
    .where(and(gte(activities.occurredAt, w.startAt), sql`${activities.occurredAt} < ${w.endAt}`, eq(activities.void, false)));
  for (const a of acts) {
    const drops = dropsFor(a.typeId, overrides);
    if (Object.keys(drops).length === 0) continue;
    candidates.push({ sourceType: "activity", sourceId: a.id, typeId: a.typeId, day: a.day, at: a.occurredAt.getTime(), drops });
    if (a.typeId === "checkin_gratitude") continue;
  }

  // Sleep in window (+ performance) per night of the week.
  const nights = await db
    .select({ day: checkins.day, status: checkins.bedtimeStatus, gratitude: checkins.gratitude })
    .from(checkins)
    .where(and(gte(checkins.day, start), lte(checkins.day, end)));
  const sleeps = await db
    .select({ day: whoopSleeps.day, perf: whoopSleeps.perfPct, start: whoopSleeps.start })
    .from(whoopSleeps)
    .where(and(eq(whoopSleeps.nap, false), gte(whoopSleeps.start, w.startAt), sql`${whoopSleeps.start} < ${w.endAt}`));
  for (const n of nights) {
    if (n.status === "in" || n.status === "early") {
      const s = sleeps.find((x) => x.day > n.day) ?? sleeps.find((x) => x.day === n.day);
      const typeId = (s?.perf ?? 0) >= 85 ? "sleep_in_window" : "sleep_in_window_low";
      candidates.push({ sourceType: "night", sourceId: n.day, typeId, day: n.day, at: new Date(n.day).getTime(), drops: dropsFor(typeId, overrides) });
    }
    if (n.gratitude && n.gratitude.trim()) {
      candidates.push({ sourceType: "gratitude", sourceId: n.day, typeId: "checkin_gratitude", day: n.day, at: new Date(n.day).getTime() + 1, drops: dropsFor("checkin_gratitude", overrides) });
    }
  }

  // Consistent meal days.
  const totals = await totalsForDays(dayRange(start, end));
  for (const t of totals) {
    if (isConsistentDay(t, settings.nutrition)) {
      candidates.push({ sourceType: "mealday", sourceId: t.day, typeId: "consistent_meal_day", day: t.day, at: new Date(t.day).getTime(), drops: dropsFor("consistent_meal_day", overrides) });
    }
  }

  // Apply weekly caps per type (earliest first).
  candidates.sort((a, b) => a.at - b.at);
  const seen = new Map<string, number>();
  const kept: Candidate[] = [];
  for (const c of candidates) {
    const cap = caps[c.typeId] ?? ACTIVITY_TYPE_BY_ID[c.typeId]?.weeklyCap;
    const n = (seen.get(c.typeId) ?? 0) + 1;
    seen.set(c.typeId, n);
    if (cap !== undefined && n > cap) continue;
    kept.push(c);
  }

  let written = 0;
  const keys: string[] = [];
  for (const c of kept) {
    for (const cup of CUPS) {
      const d = c.drops[cup] ?? 0;
      if (d <= 0) continue;
      keys.push(`${c.sourceType}|${c.sourceId}|${cup}`);
      await db
        .insert(neuroDrops)
        .values({ weekKey: wk, day: c.day, cup, drops: d, typeId: c.typeId, sourceType: c.sourceType, sourceId: c.sourceId })
        .onConflictDoUpdate({
          target: [neuroDrops.sourceType, neuroDrops.sourceId, neuroDrops.cup],
          set: { drops: d, typeId: c.typeId, weekKey: wk, day: c.day },
        });
      written += 1;
    }
  }
  // Drop rows for sources that no longer qualify (voided activity, edited meal, re-scored sleep).
  const existing = await db.select({ id: neuroDrops.id, sourceType: neuroDrops.sourceType, sourceId: neuroDrops.sourceId, cup: neuroDrops.cup }).from(neuroDrops).where(eq(neuroDrops.weekKey, wk));
  const stale = existing.filter((r) => !keys.includes(`${r.sourceType}|${r.sourceId}|${r.cup}`)).map((r) => r.id);
  if (stale.length) await db.delete(neuroDrops).where(inArray(neuroDrops.id, stale));
  return { written, removed: stale.length };
}

export async function cupFills(wk: WeekKey, capacity: number): Promise<CupFill[]> {
  const rows = await db
    .select({ cup: neuroDrops.cup, total: sql<number>`coalesce(sum(${neuroDrops.drops}), 0)::int` })
    .from(neuroDrops)
    .where(eq(neuroDrops.weekKey, wk))
    .groupBy(neuroDrops.cup);
  return CUPS.map((cup) => {
    const drops = rows.find((r) => r.cup === cup)?.total ?? 0;
    return { cup, drops, capacity, fill: Math.min(1, capacity > 0 ? drops / capacity : 0) };
  });
}

/** Mean weekly fill per cup across the weeks overlapping a month, weighted by days in month. */
export async function monthCupFills(monthKey: string, capacity: number): Promise<Array<CupFill & { weeks: CupFill[][] }>> {
  const { start, end } = (await import("../time")).monthRange(monthKey);
  const days = dayRange(start, end);
  const weekKeys = Array.from(new Set(days.map((d) => toWeekKey(d))));
  const perWeek = await Promise.all(weekKeys.map((wk) => cupFills(wk, capacity)));
  const weights = weekKeys.map((wk) => days.filter((d) => toWeekKey(d) === wk).length / days.length);
  return CUPS.map((cup) => {
    const fill = perWeek.reduce((acc, fills, i) => acc + (fills.find((f) => f.cup === cup)?.fill ?? 0) * weights[i], 0);
    return { cup, drops: Math.round(fill * capacity), capacity, fill, weeks: perWeek };
  });
}

