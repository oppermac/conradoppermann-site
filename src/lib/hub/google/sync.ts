import { and, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "../db/client";
import { calendarEvents } from "../db/schema";
import { getSettings } from "../settings";
import { addDays, dayKey, localToUtc } from "../time";
import { assertWritable, createEvent, listEvents, type GCalEvent, type NewEvent } from "./calendar";

export const SYNC_PAST_DAYS = 14;
export const SYNC_FUTURE_DAYS = 28;

export function eventTimes(e: GCalEvent): { start: Date; end: Date; allDay: boolean } {
  if (e.start.date) {
    // All-day: Google's end date is exclusive.
    const start = localToUtc(e.start.date, "00:00");
    const end = localToUtc(e.end.date ?? addDays(e.start.date, 1), "00:00");
    return { start, end, allDay: true };
  }
  return { start: new Date(e.start.dateTime!), end: new Date(e.end.dateTime ?? e.start.dateTime!), allDay: false };
}

export type CalendarSyncSummary = { calendars: number; events: number; removed: number };

/** Windowed full refresh of every read calendar; rows missing from the window are soft-deleted. */
export async function syncCalendars(): Promise<CalendarSyncSummary> {
  const { settings } = await getSettings();
  const today = dayKey();
  const timeMin = localToUtc(addDays(today, -SYNC_PAST_DAYS), "00:00");
  const timeMax = localToUtc(addDays(today, SYNC_FUTURE_DAYS), "00:00");
  const summary: CalendarSyncSummary = { calendars: 0, events: 0, removed: 0 };

  for (const calendarId of settings.calendars.read) {
    const startedAt = new Date();
    const items = await listEvents(calendarId, timeMin.toISOString(), timeMax.toISOString());
    summary.calendars += 1;
    for (const e of items) {
      const { start, end, allDay } = eventTimes(e);
      const self = e.attendees?.find((a) => a.self);
      const priv = e.extendedProperties?.private ?? {};
      const values = {
        calendarId,
        id: e.id,
        title: e.summary ?? "",
        description: e.description ?? null,
        location: e.location ?? null,
        start,
        end,
        allDay,
        status: e.status ?? null,
        htmlLink: e.htmlLink ?? null,
        attendeesCount: e.attendees?.length ?? 0,
        selfResponse: self?.responseStatus ?? null,
        hubCreated: priv.hub === "1",
        hubKind: priv.hubKind ?? null,
        deleted: e.status === "cancelled",
        raw: e,
        syncedAt: new Date(),
        updatedAt: new Date(),
      };
      await db
        .insert(calendarEvents)
        .values(values)
        .onConflictDoUpdate({
          target: [calendarEvents.calendarId, calendarEvents.id],
          set: {
            title: values.title,
            description: values.description,
            location: values.location,
            start: values.start,
            end: values.end,
            allDay: values.allDay,
            status: values.status,
            htmlLink: values.htmlLink,
            attendeesCount: values.attendeesCount,
            selfResponse: values.selfResponse,
            hubCreated: values.hubCreated,
            hubKind: values.hubKind,
            deleted: values.deleted,
            raw: values.raw,
            syncedAt: values.syncedAt,
            updatedAt: values.updatedAt,
          },
        });
      summary.events += 1;
    }
    // Anything in the window that this sync did not touch has been removed from Google.
    const removed = await db
      .update(calendarEvents)
      .set({ deleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(calendarEvents.calendarId, calendarId),
          gte(calendarEvents.start, timeMin),
          lt(calendarEvents.start, timeMax),
          lte(calendarEvents.syncedAt, startedAt),
          eq(calendarEvents.deleted, false),
        ),
      )
      .returning({ id: calendarEvents.id });
    summary.removed += removed.length;
  }
  return summary;
}

/** Create an event in the private calendar (and only there), then cache it locally so gaps update at once. */
export async function createHubEvent(e: NewEvent): Promise<{ calendarId: string; id: string; htmlLink: string | null }> {
  const { settings } = await getSettings();
  const calendarId = settings.calendars.write;
  assertWritable(calendarId ?? "", calendarId);
  const created = await createEvent(calendarId!, e);
  await db
    .insert(calendarEvents)
    .values({
      calendarId: calendarId!,
      id: created.id,
      title: created.summary ?? e.summary,
      description: e.description ?? null,
      location: e.location ?? null,
      start: e.start,
      end: e.end,
      allDay: false,
      status: created.status ?? "confirmed",
      htmlLink: created.htmlLink ?? null,
      attendeesCount: 0,
      hubCreated: true,
      hubKind: e.hubKind,
      raw: created,
    })
    .onConflictDoNothing();
  return { calendarId: calendarId!, id: created.id, htmlLink: created.htmlLink ?? null };
}

export async function upcomingEvents(from: Date, to: Date) {
  return db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.end, from), lte(calendarEvents.start, to), eq(calendarEvents.deleted, false)))
    .orderBy(calendarEvents.start);
}

export const eventCountSql = sql<number>`count(*)::int`;
