import { getAccessToken, markReauthRequired } from "../tokens";
import { TZ } from "../time";
import { refreshGoogleToken } from "./oauth";

const BASE = "https://www.googleapis.com/calendar/v3";

export type GCalTime = { dateTime?: string; date?: string; timeZone?: string };
export type GCalEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: GCalTime;
  end: GCalTime;
  attendees?: Array<{ email?: string; self?: boolean; responseStatus?: string; organizer?: boolean; displayName?: string }>;
  eventType?: string;
  transparency?: string;
  extendedProperties?: { private?: Record<string, string>; shared?: Record<string, string> };
  recurringEventId?: string;
  updated?: string;
  created?: string;
};

export type GCalCalendar = { id: string; summary: string; primary?: boolean; accessRole?: string; timeZone?: string };

export class GoogleApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function gfetch<T>(path: string, init: RequestInit & { params?: Record<string, string | undefined> } = {}, attempt = 0): Promise<T> {
  const token = await getAccessToken("google", refreshGoogleToken);
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(init.params ?? {})) if (v !== undefined) url.searchParams.set(k, v);
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if ((res.status === 429 || res.status === 503) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    return gfetch<T>(path, init, attempt + 1);
  }
  if (res.status === 401) {
    await markReauthRequired("google");
    throw new GoogleApiError(401, "Google rejected the access token; reconnect Google in Settings");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) throw new GoogleApiError(res.status, `Google ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export async function listCalendars(): Promise<GCalCalendar[]> {
  const data = await gfetch<{ items?: GCalCalendar[] }>("/users/me/calendarList", { params: { minAccessRole: "reader" } });
  return data.items ?? [];
}

/** Expanded single events between timeMin and timeMax (RFC3339), ordered by start. */
export async function listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GCalEvent[]> {
  const out: GCalEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const data = await gfetch<{ items?: GCalEvent[]; nextPageToken?: string }>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        params: {
          timeMin,
          timeMax,
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "250",
          showDeleted: "true",
          timeZone: TZ,
          pageToken,
        },
      },
    );
    out.push(...(data.items ?? []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return out;
}

export type NewEvent = {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  hubKind: string;
  location?: string;
};

export async function createEvent(calendarId: string, e: NewEvent): Promise<GCalEvent> {
  return gfetch<GCalEvent>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: { dateTime: e.start.toISOString(), timeZone: TZ },
      end: { dateTime: e.end.toISOString(), timeZone: TZ },
      extendedProperties: { private: { hub: "1", hubKind: e.hubKind } },
    }),
  });
}

export async function patchEvent(calendarId: string, eventId: string, patch: Partial<NewEvent>): Promise<GCalEvent> {
  return gfetch<GCalEvent>(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.start ? { start: { dateTime: patch.start.toISOString(), timeZone: TZ } } : {}),
      ...(patch.end ? { end: { dateTime: patch.end.toISOString(), timeZone: TZ } } : {}),
    }),
  });
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  await gfetch<void>(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}

/** The only calendar the hub may write to is the one chosen in Settings. Pure so it can be unit-tested. */
export function assertWritable(calendarId: string, writeCalendarId: string | null): void {
  if (!writeCalendarId) throw new Error("Choose your private calendar in Settings before the hub can add events.");
  if (calendarId !== writeCalendarId) {
    throw new Error(`The hub only writes to the private calendar (${writeCalendarId}), not ${calendarId}.`);
  }
}
