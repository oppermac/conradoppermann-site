/**
 * Everything in the hub is computed in Europe/Dublin. Day keys are YYYY-MM-DD, weeks start on Monday,
 * week keys are ISO ("2026-W37"). All conversions are DST-safe (Ireland changes clocks on 25 Oct 2026).
 */
export const TZ = "Europe/Dublin";

export type DayKey = string; // YYYY-MM-DD
export type WeekKey = string; // YYYY-Www
export type MonthKey = string; // YYYY-MM

export type DublinDateTime = {
  dayKey: DayKey;
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 1 = Monday … 7 = Sunday
  hour: number;
  minute: number;
  second: number;
  offsetMinutes: number; // minutes ahead of UTC (60 in summer, 0 in winter)
  hhmm: string;
};

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const pad = (n: number) => String(n).padStart(2, "0");

/** Break a UTC instant into Dublin wall-clock parts. */
export function dublin(date: Date = new Date()): DublinDateTime {
  const p: Record<string, string> = {};
  for (const part of partsFmt.formatToParts(date)) if (part.type !== "literal") p[part.type] = part.value;
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  const hour = Number(p.hour) % 24;
  const minute = Number(p.minute);
  const second = Number(p.second);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMinutes = Math.round((asUtc - date.getTime()) / 60000);
  return {
    dayKey: `${year}-${pad(month)}-${pad(day)}`,
    year,
    month,
    day,
    weekday: WEEKDAYS[p.weekday] ?? 1,
    hour,
    minute,
    second,
    offsetMinutes,
    hhmm: `${pad(hour)}:${pad(minute)}`,
  };
}

export function dayKey(date: Date = new Date()): DayKey {
  return dublin(date).dayKey;
}

export function parseDayKey(key: DayKey): { year: number; month: number; day: number } {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Bad day key: ${key}`);
  return { year: y, month: m, day: d };
}

function fromUtcDate(d: Date): DayKey {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function toUtcDate(key: DayKey): Date {
  const { year, month, day } = parseDayKey(key);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Calendar arithmetic on day keys (no time zone involved). */
export function addDays(key: DayKey, n: number): DayKey {
  const d = toUtcDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtcDate(d);
}

export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86400000);
}

/** 1 = Monday … 7 = Sunday. */
export function weekdayOf(key: DayKey): number {
  const d = toUtcDate(key).getUTCDay();
  return d === 0 ? 7 : d;
}

export function weekStart(key: DayKey): DayKey {
  return addDays(key, 1 - weekdayOf(key));
}

export function weekEnd(key: DayKey): DayKey {
  return addDays(weekStart(key), 6);
}

/** ISO week key, e.g. 2026-W37. */
export function weekKey(key: DayKey): WeekKey {
  const thursday = addDays(key, 4 - weekdayOf(key));
  const { year } = parseDayKey(thursday);
  const jan1 = `${year}-01-01`;
  const week = 1 + Math.floor(daysBetween(jan1, thursday) / 7);
  return `${year}-W${pad(week)}`;
}

/** Monday and Sunday of an ISO week key. */
export function weekRange(wk: WeekKey): { start: DayKey; end: DayKey } {
  const m = /^(\d{4})-W(\d{2})$/.exec(wk);
  if (!m) throw new Error(`Bad week key: ${wk}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = `${year}-01-04`; // always in ISO week 1
  const start = addDays(weekStart(jan4), (week - 1) * 7);
  return { start, end: addDays(start, 6) };
}

export function monthKey(key: DayKey): MonthKey {
  return key.slice(0, 7);
}

export function monthRange(mk: MonthKey): { start: DayKey; end: DayKey } {
  const [y, m] = mk.split("-").map(Number);
  const start = `${y}-${pad(m)}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start, end: `${y}-${pad(m)}-${pad(last)}` };
}

/** Day keys from start to end inclusive. */
export function dayRange(start: DayKey, end: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

/** Dublin wall-clock (day + HH:MM) → UTC instant, DST-safe. */
export function localToUtc(key: DayKey, hhmm: string): Date {
  const { year, month, day } = parseDayKey(key);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, h, mi);
  const offset1 = dublin(new Date(guess)).offsetMinutes;
  let result = guess - offset1 * 60000;
  const offset2 = dublin(new Date(result)).offsetMinutes;
  if (offset2 !== offset1) result = guess - offset2 * 60000;
  return new Date(result);
}

export function hhmmOf(date: Date): string {
  return dublin(date).hhmm;
}

export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since 18:00 so that evening windows crossing midnight compare linearly (22:30 → 270, 00:30 → 390). */
export function minutesFrom18(hhmm: string): number {
  const m = minutesOfDay(hhmm) - 18 * 60;
  return m < 0 ? m + 24 * 60 : m;
}

export type BedtimeWindow = { start: string; end: string; graceMin?: number };

/** In window when bedtime is no later than end (+ grace). Earlier than start counts as in window ("early"). */
export function bedtimeStatus(hhmm: string, w: BedtimeWindow): "early" | "in" | "late" {
  const t = minutesFrom18(hhmm);
  const s = minutesFrom18(w.start);
  const e = minutesFrom18(w.end) + (w.graceMin ?? 10);
  if (t < s) return "early";
  if (t <= e) return "in";
  return "late";
}

export function formatDayLong(key: DayKey): string {
  const { year, month, day } = parseDayKey(key);
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatDayShort(key: DayKey): string {
  const { year, month, day } = parseDayKey(key);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
