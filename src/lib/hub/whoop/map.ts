import type { WorkoutKind } from "../db/schema";
import type { DayKey } from "../time";

/** "+01:00" | "-05:30" | "Z" → minutes. */
export function offsetMinutes(tz: string | null | undefined): number {
  if (!tz || tz === "Z") return 0;
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(tz);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

/** Local calendar day for an instant, using the offset Whoop recorded at the time. */
export function localDayFor(iso: string, tz: string | null | undefined): DayKey {
  const shifted = new Date(new Date(iso).getTime() + offsetMinutes(tz) * 60000);
  return shifted.toISOString().slice(0, 10);
}

export function localHHMM(iso: string, tz: string | null | undefined): string {
  const shifted = new Date(new Date(iso).getTime() + offsetMinutes(tz) * 60000);
  return shifted.toISOString().slice(11, 16);
}

export function durationMinutes(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

/** Sport classes. Names are matched lowercased; substrings are fine (e.g. "spin" matches "spinning"). */
const SPORT_CLASSES: Array<{ kind: WorkoutKind; category?: "racket" | "team"; names: string[] }> = [
  {
    kind: "cardio",
    names: [
      "running", "run", "cycling", "ride", "spinning", "spin", "rowing", "elliptical", "stairmaster", "assault bike",
      "jumping rope", "jump rope", "mountain biking", "cross country skiing", "duathlon", "triathlon", "inline skating",
      "swimming", "boxing", "kickboxing", "martial arts", "jiu jitsu", "wrestling", "dance", "track & field",
    ],
  },
  { kind: "cardio", category: "racket", names: ["tennis", "padel", "paddle tennis", "squash", "badminton", "table tennis", "pickleball"] },
  {
    kind: "cardio",
    category: "team",
    names: [
      "football", "soccer", "gaelic", "hurling", "camogie", "rugby", "basketball", "ice hockey", "field hockey",
      "hockey", "cricket", "ultimate", "volleyball", "handball", "netball", "lacrosse", "australian football",
    ],
  },
  { kind: "strength", names: ["weightlifting", "powerlifting", "strength trainer", "strength training", "calisthenics", "pilates", "barre"] },
  { kind: "mixed", names: ["hiit", "functional fitness", "circuit", "f45", "barry", "box fitness", "obstacle", "crossfit"] },
  { kind: "mobility", names: ["yoga", "stretching", "mobility"] },
  { kind: "movement", names: ["walking", "walk", "hiking", "rucking", "stroller", "dog walking"] },
  {
    kind: "leisure",
    names: [
      "golf", "sailing", "surfing", "kite", "paddleboard", "kayak", "water ski", "wakeboard", "skiing", "snowboard",
      "climbing", "horseback", "skateboard", "ice skating", "diving", "snorkel",
    ],
  },
  { kind: "recovery", names: ["meditation", "breathwork", "sauna", "ice bath", "air compression", "percussive", "massage"] },
];

export type SportClass = { kind: WorkoutKind; category?: "racket" | "team" };

export function classifySport(sportName: string | null | undefined, overrides: Record<string, string> = {}): SportClass {
  const name = (sportName ?? "").trim().toLowerCase();
  if (!name) return { kind: "other" };
  const override = overrides[name];
  if (override) return { kind: override as WorkoutKind };
  for (const cls of SPORT_CLASSES) {
    if (cls.names.some((n) => name === n || name.includes(n))) return { kind: cls.kind, category: cls.category };
  }
  return { kind: "other" };
}

/** Minimum minutes for a workout to count as a training session. */
export function sessionMinimum(cls: SportClass, sportName: string | null | undefined, defaultMin = 20): number {
  const name = (sportName ?? "").toLowerCase();
  if (name.includes("swim")) return 15;
  if (cls.category === "racket" || cls.category === "team") return 30;
  if (name.includes("pilates") || name.includes("barre")) return 40;
  return defaultMin;
}

export type SessionDecision = {
  /** Kind after promotions (a long brisk walk becomes cardio). */
  effectiveKind: WorkoutKind;
  countsAsSession: boolean;
  /** Activity type id in the catalogue for the activities row. */
  typeId: string | null;
};

export function decideSession(
  cls: SportClass,
  sportName: string | null | undefined,
  minutes: number,
  strain: number | null | undefined,
  targets: { minSessionMin: number; walkCardioMin: number; walkCardioStrain: number },
): SessionDecision {
  let kind = cls.kind;
  const name = (sportName ?? "").toLowerCase();
  if (kind === "movement") {
    const hiking = name.includes("hik") || name.includes("ruck");
    if ((hiking && minutes >= 45) || (minutes >= targets.walkCardioMin && (strain ?? 0) >= targets.walkCardioStrain)) {
      kind = "cardio";
    }
  }
  if (kind === "leisure" && minutes >= 45 && (strain ?? 0) >= 10) kind = "cardio";

  const isTraining = kind === "cardio" || kind === "strength" || kind === "mixed";
  const counts = isTraining && minutes >= sessionMinimum(cls, sportName, targets.minSessionMin);
  let typeId: string | null = null;
  if (counts) typeId = cls.category ? "team_sport" : kind;
  else if (cls.kind === "mobility" && minutes >= 10) typeId = "mobility";
  else if (cls.kind === "movement" && minutes >= 30) typeId = "walk";
  else if (cls.kind === "leisure" && minutes >= 60) typeId = "nature";
  else if (cls.kind === "recovery") typeId = /sauna|ice/.test(name) ? "sauna_cold" : /massage/.test(name) ? "massage" : "meditation";
  return { effectiveKind: kind, countsAsSession: counts, typeId };
}
