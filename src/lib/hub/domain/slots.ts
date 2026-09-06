import { addDays, dayKey, dublin, formatDayShort, localToUtc, weekdayOf, type DayKey } from "../time";

export type Interval = { start: Date; end: Date };
export type SlotKind = "training" | "friend" | "family" | "date" | "ceo_block" | "operating_review" | "enjoyable" | "rest";
export type Slot = { start: Date; end: Date; dayKey: DayKey; label: string };

type Window = { weekdays: number[]; ranges: Array<[string, string]>; durationMin: number };
const ALL = [1, 2, 3, 4, 5, 6, 7];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [6, 7];

const WINDOWS: Record<SlotKind, Window[]> = {
  training: [{ weekdays: ALL, ranges: [["07:00", "08:30"], ["12:30", "13:30"], ["18:00", "20:00"]], durationMin: 60 }],
  friend: [
    { weekdays: WEEKDAYS, ranges: [["18:30", "21:30"]], durationMin: 120 },
    { weekdays: WEEKEND, ranges: [["12:00", "21:30"]], durationMin: 120 },
  ],
  family: [
    { weekdays: WEEKEND, ranges: [["12:00", "18:00"]], durationMin: 90 },
    { weekdays: WEEKDAYS, ranges: [["18:30", "21:00"]], durationMin: 60 },
  ],
  date: [
    { weekdays: WEEKDAYS, ranges: [["19:00", "22:00"]], durationMin: 120 },
    { weekdays: WEEKEND, ranges: [["12:00", "22:00"]], durationMin: 120 },
  ],
  ceo_block: [{ weekdays: WEEKDAYS, ranges: [["09:00", "11:00"]], durationMin: 120 }],
  operating_review: [
    { weekdays: [5], ranges: [["14:00", "16:00"]], durationMin: 60 },
    { weekdays: WEEKDAYS, ranges: [["14:00", "17:00"]], durationMin: 60 },
  ],
  enjoyable: [
    { weekdays: WEEKDAYS, ranges: [["18:30", "22:00"]], durationMin: 120 },
    { weekdays: WEEKEND, ranges: [["10:00", "22:00"]], durationMin: 120 },
  ],
  rest: [{ weekdays: ALL, ranges: [["20:00", "22:00"]], durationMin: 45 }],
};

const BUFFER_MS = 10 * 60 * 1000;

function overlaps(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() + BUFFER_MS && b.start.getTime() < a.end.getTime() + BUFFER_MS;
}

function label(start: Date, end: Date, key: DayKey): string {
  return `${formatDayShort(key).replace(/,? \d+ \w+$/, "")} ${dublin(start).hhmm}–${dublin(end).hhmm}`;
}

/**
 * Up to `count` free slots for a kind between `from` and `until`, honouring the kind's preferred windows,
 * existing busy intervals (with a 10-minute buffer), and never earlier than 30 minutes from `from`.
 */
export function findSlots(opts: { kind: SlotKind; from: Date; until: Date; busy: Interval[]; count?: number }): Slot[] {
  const { kind, from, until, busy } = opts;
  const count = opts.count ?? 3;
  const out: Slot[] = [];
  const earliest = new Date(from.getTime() + 30 * 60 * 1000);
  const firstDay = dayKey(from);
  const lastDay = dayKey(until);
  const usedDays = new Set<string>();

  for (let day = firstDay; day <= lastDay && out.length < count; day = addDays(day, 1)) {
    const wd = weekdayOf(day);
    const windows = WINDOWS[kind].filter((w) => w.weekdays.includes(wd));
    for (const w of windows) {
      if (out.length >= count) break;
      for (const [rs, re] of w.ranges) {
        if (usedDays.has(`${day}:${rs}`)) continue;
        const rangeStart = localToUtc(day, rs);
        const rangeEnd = localToUtc(day, re);
        const dur = w.durationMin * 60 * 1000;
        let t = Math.max(rangeStart.getTime(), earliest.getTime());
        // Align to the next half hour.
        t = Math.ceil(t / (30 * 60 * 1000)) * (30 * 60 * 1000);
        let placed = false;
        while (t + dur <= rangeEnd.getTime() && !placed) {
          const cand = { start: new Date(t), end: new Date(t + dur) };
          if (cand.end.getTime() > until.getTime()) break;
          if (!busy.some((b) => overlaps(cand, b))) {
            out.push({ ...cand, dayKey: day, label: label(cand.start, cand.end, day) });
            usedDays.add(`${day}:${rs}`);
            placed = true;
          }
          t += 30 * 60 * 1000;
        }
        if (out.length >= count) break;
      }
    }
  }
  return out;
}
