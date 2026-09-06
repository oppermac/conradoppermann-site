import { addDays, daysBetween, weekStart, type DayKey } from "../time";

export const PROGRAMME_START: DayKey = "2026-09-01";
export const PROGRAMME_END: DayKey = "2026-12-31";
export const WORK_HOURS = { start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] as number[] };

export const DOMAINS = ["work", "body", "relationships", "aliveness"] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_META: Record<Domain, { label: string; short: string; outcome: string; colorVar: string }> = {
  work: {
    label: "Work",
    short: "Work",
    outcome: "Maverick is growing without requiring your constant intervention.",
    colorVar: "--hub-work",
  },
  body: {
    label: "Body",
    short: "Body",
    outcome: "Stable energy, sleep and emotional regulation.",
    colorVar: "--hub-body",
  },
  relationships: {
    label: "Relationships",
    short: "People",
    outcome: "Stronger belonging and healthier romantic judgement.",
    colorVar: "--hub-rel",
  },
  aliveness: {
    label: "Aliveness",
    short: "Alive",
    outcome: "Life still feels cinematic, expansive and enjoyable.",
    colorVar: "--hub-alive",
  },
};

export const PROGRAMME_WEEK_1_START = weekStart(PROGRAMME_START); // Mon 31 Aug 2026
export const PROGRAMME_WEEKS = Math.floor(daysBetween(PROGRAMME_WEEK_1_START, PROGRAMME_END) / 7) + 1; // 18
export const PROGRAMME_DAYS = daysBetween(PROGRAMME_START, PROGRAMME_END) + 1; // 122

export type ProgrammePosition = {
  inProgramme: boolean;
  day: number; // 1-based day of programme (clamped)
  ofDays: number;
  week: number; // 1-based programme week (clamped)
  ofWeeks: number;
  daysLeft: number;
  weekStart: DayKey;
  weekEnd: DayKey;
};

export function programmePosition(key: DayKey): ProgrammePosition {
  const rawDay = daysBetween(PROGRAMME_START, key) + 1;
  const rawWeek = Math.floor(daysBetween(PROGRAMME_WEEK_1_START, key) / 7) + 1;
  const ws = weekStart(key);
  return {
    inProgramme: key >= PROGRAMME_START && key <= PROGRAMME_END,
    day: Math.min(Math.max(rawDay, 1), PROGRAMME_DAYS),
    ofDays: PROGRAMME_DAYS,
    week: Math.min(Math.max(rawWeek, 1), PROGRAMME_WEEKS),
    ofWeeks: PROGRAMME_WEEKS,
    daysLeft: Math.max(0, daysBetween(key, PROGRAMME_END)),
    weekStart: ws,
    weekEnd: addDays(ws, 6),
  };
}
