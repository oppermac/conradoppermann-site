/**
 * Pure KPI maths shared by dashboards, the gap engine, nudges and the coach context.
 * Inputs are plain counts so this file has no data dependencies and is unit-tested.
 */
import type { Domain } from "./programme";

export type Rag = "green" | "amber" | "red";
export type RiskLevel = "none" | "amber" | "red";

export type BehaviourId =
  | "ceo_blocks"
  | "operating_review"
  | "sessions"
  | "meals"
  | "bedtime"
  | "friend_plans"
  | "family_touchpoint"
  | "enjoyable"
  | "memorable";

export const BEHAVIOUR_META: Record<
  BehaviourId,
  { domain: Domain; label: string; unit: string; period: "week" | "month"; scored: boolean }
> = {
  ceo_blocks: { domain: "work", label: "CEO blocks", unit: "blocks", period: "week", scored: true },
  operating_review: { domain: "work", label: "Operating review", unit: "review", period: "week", scored: true },
  sessions: { domain: "body", label: "Training sessions", unit: "sessions", period: "week", scored: true },
  meals: { domain: "body", label: "Consistent meal days", unit: "days", period: "week", scored: true },
  bedtime: { domain: "body", label: "Nights in bedtime window", unit: "nights", period: "week", scored: true },
  friend_plans: { domain: "relationships", label: "Friend plans", unit: "plans", period: "week", scored: true },
  family_touchpoint: { domain: "relationships", label: "Family touchpoint", unit: "touchpoint", period: "week", scored: true },
  enjoyable: { domain: "aliveness", label: "Enjoyable activity", unit: "activity", period: "week", scored: true },
  memorable: { domain: "aliveness", label: "Memorable experience", unit: "experience", period: "month", scored: true },
};

export type BehaviourFacts = {
  id: BehaviourId;
  target: number;
  done: number;
  scheduled: number;
  /** sessions only */
  cardioDone?: number;
  strengthDone?: number;
  cardioTarget?: number;
  strengthTarget?: number;
  /** bedtime only: nights with data so far */
  nightsWithData?: number;
};

export function gapOf(f: BehaviourFacts): number {
  return Math.max(0, f.target - f.done - f.scheduled);
}

/** RAG as it would read at the end of the period (done only, scheduled ignored). */
export function ragAtEnd(f: BehaviourFacts): Rag {
  switch (f.id) {
    case "ceo_blocks":
      return f.done >= 3 ? "green" : f.done === 2 ? "amber" : "red";
    case "operating_review":
    case "family_touchpoint":
    case "enjoyable":
    case "memorable":
      return f.done >= f.target ? "green" : "red";
    case "sessions": {
      const mixOk =
        (f.cardioDone ?? 0) >= (f.cardioTarget ?? 2) && (f.strengthDone ?? 0) >= (f.strengthTarget ?? 2);
      if (f.done >= f.target && mixOk) return "green";
      if (f.done >= 3) return "amber";
      return "red";
    }
    case "meals":
      return f.done >= 5 ? "green" : f.done >= 3 ? "amber" : "red";
    case "bedtime": {
      if ((f.nightsWithData ?? 7) < 4) return f.done >= 3 ? "amber" : "red";
      return f.done >= 5 ? "green" : f.done === 4 ? "amber" : "red";
    }
    case "friend_plans":
      return f.done >= 2 ? "green" : f.done === 1 ? "amber" : "red";
  }
}

/** Days still to come in the week after today (Mon=1 → 6, Sun=7 → 0). */
export function daysLeftInWeek(weekday: number): number {
  return 7 - weekday;
}

/**
 * In-week risk, evaluated at a Dublin weekday/hour. Mirrors the plan: nothing fires before Wednesday
 * except the daily rhythms; scheduled items count as if done.
 */
export function riskNow(f: BehaviourFacts, weekday: number, hour: number, dayOfMonth = 1): RiskLevel {
  const ahead = f.done + f.scheduled;
  const left = daysLeftInWeek(weekday);
  switch (f.id) {
    case "ceo_blocks":
      if (weekday === 1 && hour >= 9 && ahead < 3) return "amber";
      if (weekday >= 3 && hour >= 12 && ahead < 3) return ahead <= 1 && weekday >= 4 ? "red" : "amber";
      return "none";
    case "operating_review":
      if (weekday >= 3 && hour >= 12 && ahead < 1) return weekday >= 5 ? "red" : "amber";
      return "none";
    case "sessions":
      if (weekday >= 4 && hour >= 18 && 3 - ahead > left) return "red";
      if (weekday >= 3 && hour >= 18 && ahead < 2) return "amber";
      if (weekday >= 4 && hour >= 18 && f.target - ahead > left) return "amber";
      return "none";
    case "meals":
      if (weekday >= 5 && hour >= 12 && 5 - f.done > left + 1) return "amber";
      return "none";
    case "bedtime":
      if (weekday >= 5 && 5 - f.done > left + 1) return "amber";
      return "none";
    case "friend_plans":
      if (weekday >= 3 && hour >= 18 && ahead < 1) return weekday >= 4 ? "red" : "amber";
      if (weekday >= 4 && hour >= 18 && ahead < 2) return "amber";
      return "none";
    case "family_touchpoint":
      if (weekday >= 6 && hour >= 11 && ahead < 1) return weekday === 7 ? "red" : "amber";
      return "none";
    case "enjoyable":
      if (weekday >= 5 && hour >= 12 && ahead < 1) return weekday >= 6 ? "red" : "amber";
      return "none";
    case "memorable":
      if (dayOfMonth >= 20 && ahead < 1) return dayOfMonth >= 28 ? "red" : "amber";
      return "none";
  }
}

export function worstRag(list: Rag[]): Rag {
  if (list.includes("red")) return "red";
  if (list.includes("amber")) return "amber";
  return "green";
}

/** Ring progress for a domain: mean of min(1, done/target) across its scored behaviours. */
export function ringProgress(list: BehaviourFacts[]): number {
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, f) => acc + Math.min(1, f.target > 0 ? f.done / f.target : 0), 0);
  return sum / list.length;
}

export function weekFullyGreen(list: BehaviourFacts[]): boolean {
  return list.filter((f) => BEHAVIOUR_META[f.id].scored && BEHAVIOUR_META[f.id].period === "week").every(
    (f) => ragAtEnd(f) === "green",
  );
}
