import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { and, asc, eq, gte, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { anthropic, hasAnthropic } from "../ai/anthropic";
import { MODELS } from "../ai/models";
import { db } from "../db/client";
import { activities, calendarEvents, classificationRules } from "../db/schema";
import { ACTIVITY_TYPE_BY_ID, KINDS_BY_DOMAIN } from "../domain/activity-types";
import { DOMAINS, type Domain } from "../domain/programme";
import { CONRADS_CALENDAR_ID, PRIMARY_CALENDAR_ID, getSettings, type Settings } from "../settings";
import { dublin, minutesOfDay, dayKey } from "../time";
import { SYNC_FUTURE_DAYS, SYNC_PAST_DAYS } from "./sync";
import { addDays, localToUtc } from "../time";

export type DomainOrNone = Domain | "none";
export type Classification = { domain: DomainOrNone; kind: string; confidence: number; by: "rule" | "ai" | "user" };

export type Rule = { pattern: string; calendarId: string | null; domain: string; kind: string; priority: number };

type EventRow = typeof calendarEvents.$inferSelect;

export function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isValidKind(domain: DomainOrNone, kind: string): boolean {
  if (domain === "none") return kind === "none";
  return (KINDS_BY_DOMAIN[domain] as readonly string[]).includes(kind);
}

/** Rules are evaluated in ascending priority; user corrections use priority 1 so they win. */
export function matchRule(title: string, calendarId: string, rules: Rule[]): Rule | null {
  const t = normaliseTitle(title);
  if (!t) return null;
  for (const r of rules) {
    if (r.calendarId && r.calendarId !== calendarId) continue;
    if (t.includes(r.pattern)) return r;
  }
  return null;
}

const HUB_KIND_MAP: Record<string, { domain: DomainOrNone; kind: string }> = {
  ceo_block: { domain: "work", kind: "ceo_block" },
  operating_review: { domain: "work", kind: "operating_review" },
  training: { domain: "body", kind: "training" },
  cardio: { domain: "body", kind: "training" },
  strength: { domain: "body", kind: "training" },
  walk: { domain: "body", kind: "walk" },
  friend_plan: { domain: "relationships", kind: "friend_plan" },
  family_touchpoint: { domain: "relationships", kind: "family_touchpoint" },
  date: { domain: "relationships", kind: "date" },
  quality_time: { domain: "relationships", kind: "quality_time" },
  enjoyable: { domain: "aliveness", kind: "enjoyable" },
  memorable: { domain: "aliveness", kind: "memorable" },
  nature: { domain: "aliveness", kind: "nature" },
  meditation: { domain: "body", kind: "recovery" },
  rest: { domain: "body", kind: "recovery" },
};

/** Defaults that need no keywords: hub-created events, all-day events, meetings, work-hours blocks. */
export function structuralDefault(ev: Pick<EventRow, "calendarId" | "allDay" | "attendeesCount" | "hubCreated" | "hubKind" | "start" | "end">, settings: Settings): Classification | null {
  if (ev.hubCreated && ev.hubKind && HUB_KIND_MAP[ev.hubKind]) {
    return { ...HUB_KIND_MAP[ev.hubKind], confidence: 1, by: "rule" };
  }
  if (ev.allDay) return { domain: "none", kind: "none", confidence: 0.6, by: "rule" };
  const isWorkCalendar = ev.calendarId === PRIMARY_CALENDAR_ID || ev.calendarId === CONRADS_CALENDAR_ID;
  if (ev.calendarId === PRIMARY_CALENDAR_ID && ev.attendeesCount > 1) {
    return { domain: "work", kind: "meeting", confidence: 0.6, by: "rule" };
  }
  const d = dublin(ev.start);
  const inWorkHours =
    d.weekday <= 5 &&
    minutesOfDay(d.hhmm) >= minutesOfDay(settings.workHours.start) &&
    minutesOfDay(d.hhmm) < minutesOfDay(settings.workHours.end);
  if (isWorkCalendar && inWorkHours) return { domain: "work", kind: "work_other", confidence: 0.5, by: "rule" };
  return null;
}

const AiOutput = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      domain: z.enum(["work", "body", "relationships", "aliveness", "none"]),
      kind: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

const AI_SYSTEM = `You classify calendar events for Conrad Oppermann (CEO of Maverick Social, a social-media agency in Dublin) into the domains of his personal programme. Be decisive and specific.

Domains and kinds:
- work: ceo_block (protected solo strategy/growth time), operating_review (a review of how the business is running), meeting (client, team or partner meetings, calls, shoots), shoot, roles_action (hiring or redefining a role), work_other (admin, correspondence, planning)
- body: training (gym, run, swim, class, PT), walk, mobility (yoga, stretching), recovery (sauna, massage, breathwork), medical (doctor, dentist, physio)
- relationships: friend_plan (dinner, drinks, coffee, pints, brunch with friends), family_touchpoint (mum, dad, siblings, longstanding friends, calls home), date, quality_time, helping
- aliveness: enjoyable (cinema, gigs, theatre, matches, sailing, golf as leisure), memorable (trips, weekends away, big occasions), gig, laughter, nature (sea swim, hikes), travel (flights, hotels, all-day trips), reading
- none: anything that is none of these (admin appointments, reminders, holidays calendar)

Rules of thumb: weekday 09:00–18:00 on the work calendars is work unless the title clearly says otherwise; events on the private calendar are never work; tickets, premieres and festivals are aliveness; a named person with dinner/drinks/coffee is a friend plan; "Mum", "Dad" or "home" is family.`;

async function classifyWithAi(events: EventRow[]): Promise<Map<string, Classification>> {
  const out = new Map<string, Classification>();
  if (events.length === 0 || !hasAnthropic()) return out;
  const items = events.map((e) => {
    const d = dublin(e.start);
    const cal =
      e.calendarId === PRIMARY_CALENDAR_ID ? "primary" : e.calendarId === CONRADS_CALENDAR_ID ? "conrads" : e.hubCreated ? "private" : "private";
    return {
      id: `${e.calendarId}|${e.id}`,
      title: e.title,
      calendar: cal,
      weekday: ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.weekday],
      start: d.hhmm,
      minutes: Math.round((e.end.getTime() - e.start.getTime()) / 60000),
      attendees: e.attendeesCount,
      allDay: e.allDay,
      location: e.location ?? undefined,
    };
  });
  const response = await anthropic().messages.parse({
    model: MODELS.classify,
    max_tokens: 4000,
    system: AI_SYSTEM,
    messages: [{ role: "user", content: `Classify these events. Return every id.\n${JSON.stringify(items)}` }],
    output_config: { format: zodOutputFormat(AiOutput) },
  });
  for (const item of response.parsed_output?.items ?? []) {
    const kind = isValidKind(item.domain, item.kind) ? item.kind : item.domain === "none" ? "none" : KINDS_BY_DOMAIN[item.domain][0];
    out.set(item.id, { domain: item.domain, kind, confidence: item.confidence, by: "ai" });
  }
  return out;
}

async function loadRules(): Promise<Rule[]> {
  return db
    .select({
      pattern: classificationRules.pattern,
      calendarId: classificationRules.calendarId,
      domain: classificationRules.domain,
      kind: classificationRules.kind,
      priority: classificationRules.priority,
    })
    .from(classificationRules)
    .orderBy(asc(classificationRules.priority), asc(classificationRules.createdAt));
}

async function setClassification(ev: EventRow, c: Classification): Promise<void> {
  await db
    .update(calendarEvents)
    .set({ domain: c.domain, kind: c.kind, classifiedBy: c.by, confidence: c.confidence, updatedAt: new Date() })
    .where(and(eq(calendarEvents.calendarId, ev.calendarId), eq(calendarEvents.id, ev.id)));
}

/** Classify every unclassified or AI-classified event in the sync window; user decisions are never touched. */
export async function classifyPending(): Promise<{ rules: number; ai: number; unresolved: number }> {
  const { settings } = await getSettings();
  const rules = await loadRules();
  const today = dayKey();
  const windowStart = localToUtc(addDays(today, -SYNC_PAST_DAYS), "00:00");
  const windowEnd = localToUtc(addDays(today, SYNC_FUTURE_DAYS), "00:00");
  const pending = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.deleted, false),
        gte(calendarEvents.start, windowStart),
        lt(calendarEvents.start, windowEnd),
        or(isNull(calendarEvents.classifiedBy), eq(calendarEvents.classifiedBy, "ai")),
      ),
    );

  let byRule = 0;
  const forAi: EventRow[] = [];
  for (const ev of pending) {
    const rule = matchRule(ev.title, ev.calendarId, rules);
    if (rule) {
      await setClassification(ev, { domain: rule.domain as DomainOrNone, kind: rule.kind, confidence: 0.9, by: "rule" });
      byRule += 1;
      continue;
    }
    const structural = structuralDefault(ev, settings);
    if (structural && (structural.confidence >= 0.6 || ev.classifiedBy === null)) {
      if (ev.classifiedBy === null) {
        await setClassification(ev, structural);
        byRule += 1;
        continue;
      }
    }
    if (ev.classifiedBy === null) forAi.push(ev);
  }

  let byAi = 0;
  for (let i = 0; i < forAi.length; i += 40) {
    const batch = forAi.slice(i, i + 40);
    try {
      const results = await classifyWithAi(batch);
      for (const ev of batch) {
        const c = results.get(`${ev.calendarId}|${ev.id}`);
        if (c) {
          await setClassification(ev, c);
          byAi += 1;
        }
      }
    } catch (err) {
      console.error("[classify] AI batch failed", err);
    }
  }
  await materialiseEventActivities();
  return { rules: byRule, ai: byAi, unresolved: forAi.length - byAi };
}

const KIND_TO_TYPE: Record<string, string> = {
  ceo_block: "ceo_block",
  operating_review: "operating_review",
  roles_action: "roles_action",
  friend_plan: "friend_plan",
  family_touchpoint: "family_touchpoint",
  date: "date",
  quality_time: "quality_time",
  helping: "helping",
  enjoyable: "enjoyable",
  memorable: "memorable",
  gig: "gig",
  laughter: "laughter",
  nature: "nature",
  travel: "travel",
  reading: "reading",
  walk: "walk",
  mobility: "mobility",
  recovery: "meditation",
};

/** Share of a block overlapped by accepted meetings with other people (a protected block needs < 25 %). */
async function overlapShare(ev: EventRow): Promise<number> {
  const others = await db
    .select({ start: calendarEvents.start, end: calendarEvents.end })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.deleted, false),
        ne(calendarEvents.id, ev.id),
        lt(calendarEvents.start, ev.end),
        gte(calendarEvents.end, ev.start),
        sql`${calendarEvents.attendeesCount} > 1`,
        or(isNull(calendarEvents.selfResponse), ne(calendarEvents.selfResponse, "declined")),
      ),
    );
  const total = ev.end.getTime() - ev.start.getTime();
  if (total <= 0) return 0;
  let overlapped = 0;
  for (const o of others) {
    overlapped += Math.max(0, Math.min(o.end.getTime(), ev.end.getTime()) - Math.max(o.start.getTime(), ev.start.getTime()));
  }
  return Math.min(1, overlapped / total);
}

/**
 * Finished, classified events become activities (source calendar) so counts and cups have one source of
 * truth. Training events are left to Whoop (they only ever count as *scheduled*). User voids survive.
 */
export async function materialiseEventActivities(): Promise<number> {
  const now = new Date();
  const done = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.deleted, false), lte(calendarEvents.end, now), sql`${calendarEvents.domain} is not null`));
  let n = 0;
  for (const ev of done) {
    const typeId = ev.kind ? KIND_TO_TYPE[ev.kind] : undefined;
    const type = typeId ? ACTIVITY_TYPE_BY_ID[typeId] : undefined;
    const ref = `${ev.calendarId}|${ev.id}`;
    if (!type || type.domain === "none") {
      await db.update(activities).set({ void: true }).where(eq(activities.calendarEventId, ref));
      continue;
    }
    let notes: string | null = null;
    let compromised = false;
    if (ev.kind === "ceo_block") {
      const share = await overlapShare(ev);
      if (share >= 0.25) {
        compromised = true;
        notes = `Compromised: ${Math.round(share * 100)}% overlapped by meetings`;
      }
    }
    const people = ev.kind === "friend_plan" || ev.kind === "family_touchpoint" || ev.kind === "date" ? extractPeople(ev.title) : null;
    const values = {
      occurredAt: ev.start,
      day: dayKey(ev.start),
      domain: type.domain,
      kind: type.kind,
      typeId: type.id,
      title: ev.title || type.label,
      durationMin: Math.round((ev.end.getTime() - ev.start.getTime()) / 60000),
      people,
      weights: type.drops,
      source: "calendar" as const,
      calendarEventId: ref,
      notes,
    };
    const existing = await db.select({ id: activities.id, void: activities.void, notes: activities.notes }).from(activities).where(eq(activities.calendarEventId, ref)).limit(1);
    if (existing[0]) {
      // Respect a manual "didn't happen"; refresh classification-derived fields only.
      const keepVoid = existing[0].void && !(existing[0].notes ?? "").startsWith("Compromised");
      await db
        .update(activities)
        .set({ domain: values.domain, kind: values.kind, typeId: values.typeId, title: values.title, durationMin: values.durationMin, weights: values.weights, occurredAt: values.occurredAt, day: values.day, void: keepVoid || compromised, notes: keepVoid ? existing[0].notes : notes })
        .where(eq(activities.id, existing[0].id));
    } else {
      await db.insert(activities).values({ ...values, void: compromised }).onConflictDoNothing();
    }
    n += 1;
  }
  return n;
}

/** "Dinner with Sean and Aoife" → ["Sean", "Aoife"]; best-effort, refined by the People list later. */
export function extractPeople(title: string): string[] | null {
  const m = /\b(?:with|w\/|&|and)\s+([A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+)*)/.exec(title);
  if (!m) return null;
  const names = m[1].split(/\s+(?:and|&)\s+/).map((s) => s.trim()).filter(Boolean);
  return names.length ? names : null;
}

export async function applyUserClassification(input: {
  calendarId: string;
  id: string;
  domain: DomainOrNone;
  kind: string;
  applyToSimilar: boolean;
}): Promise<void> {
  if (!isValidKind(input.domain, input.kind)) throw new Error(`Unknown kind ${input.kind} for ${input.domain}`);
  const [ev] = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.calendarId, input.calendarId), eq(calendarEvents.id, input.id)))
    .limit(1);
  if (!ev) throw new Error("Event not found");
  await setClassification(ev, { domain: input.domain, kind: input.kind, confidence: 1, by: "user" });
  if (input.applyToSimilar) {
    const pattern = normaliseTitle(ev.title);
    if (pattern) {
      await db.insert(classificationRules).values({ pattern, calendarId: null, domain: input.domain, kind: input.kind, priority: 1, source: "user" });
    }
  }
  await materialiseEventActivities();
}

export const DOMAIN_OPTIONS = [...DOMAINS, "none"] as const;
