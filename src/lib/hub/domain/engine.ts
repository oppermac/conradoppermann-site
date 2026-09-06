/** Glue: facts → gaps → suggestions with slots. Used by Today, Week, nudges and the coach. */
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db/client";
import { activities, people as peopleTable } from "../db/schema";
import { getSettings } from "../settings";
import { addDays, daysBetween, dublin, localToUtc, weekEnd, weekKey } from "../time";
import { cupFills, type CupFill } from "./cups";
import { busyIntervals, weekFacts } from "./facts";
import { computeGaps, type Gap } from "./gaps";
import { findSlots, type Slot } from "./slots";
import { buildSuggestions, cupsBelowPace, type PersonDue, type Suggestion } from "./suggest";

export type SuggestionWithSlots = Suggestion & { slots: Slot[] };

export async function peopleDue(todayKey: string): Promise<PersonDue[]> {
  const rows = await db.select().from(peopleTable).orderBy(peopleTable.name);
  if (rows.length === 0) return [];
  const since = addDays(todayKey, -365);
  const recent = await db
    .select({ day: activities.day, title: activities.title, people: activities.people })
    .from(activities)
    .where(and(gte(activities.day, since), eq(activities.void, false)))
    .orderBy(desc(activities.day));
  const out: PersonDue[] = [];
  for (const p of rows) {
    const names = [p.name, ...(p.aliases ?? [])].map((n) => n.trim().toLowerCase()).filter(Boolean);
    const pattern = new RegExp(`\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");
    const last = recent.find((a) => (a.people ?? []).some((n) => names.includes(n.trim().toLowerCase())) || pattern.test(a.title));
    const daysSince = last ? daysBetween(last.day, todayKey) : null;
    out.push({
      id: p.id,
      name: p.name,
      relationship: p.relationship,
      cadenceDays: p.cadenceDays,
      lastSeen: last?.day ?? null,
      daysSince,
      overdueDays: daysSince === null ? p.cadenceDays : daysSince - p.cadenceDays,
    });
  }
  return out;
}

export async function computeGapsAndSuggestions(nowDate = new Date()): Promise<{
  gaps: Gap[];
  suggestions: SuggestionWithSlots[];
  cups: CupFill[];
  lowCups: string[];
}> {
  const now = dublin(nowDate);
  const { settings } = await getSettings();
  const facts = await weekFacts(now.dayKey, settings, nowDate);
  const gaps = computeGaps(facts, now);
  const wk = weekKey(now.dayKey);
  const cups = await cupFills(wk, settings.cups.capacity);
  const elapsed = now.weekday - 1 + (now.hour + now.minute / 60) / 24;
  const lowCups = cupsBelowPace(cups, elapsed);
  const people = await peopleDue(now.dayKey);
  const suggestions = buildSuggestions({ gaps, lowCups, people, alivenessList: settings.aliveness.list });

  const until = localToUtc(addDays(weekEnd(now.dayKey), 1), "00:00");
  const busy = await busyIntervals(nowDate, until);
  const withSlots: SuggestionWithSlots[] = suggestions.map((s) => ({
    ...s,
    slots: findSlots({ kind: s.slotKind, from: nowDate, until, busy, count: 3 }),
  }));
  return { gaps, suggestions: withSlots, cups, lowCups };
}

