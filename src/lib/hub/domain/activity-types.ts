import type { Domain } from "./programme";

/** The six cups, in fixed display order. */
export const CUPS = ["dopamine", "serotonin", "oxytocin", "endorphins", "endocannabinoids", "gaba"] as const;
export type Cup = (typeof CUPS)[number];
export type Drops = Partial<Record<Cup, 0 | 1 | 2 | 3>>;

export const CUP_META: Record<Cup, { label: string; short: string; colorVar: string; blurb: string }> = {
  dopamine: {
    label: "Dopamine",
    short: "Dopa",
    colorVar: "--hub-dopa",
    blurb: "Reward and motivation: focus, drive, and the satisfaction of finishing something.",
  },
  serotonin: {
    label: "Serotonin",
    short: "Sero",
    colorVar: "--hub-sero",
    blurb: "Mood stability: daylight, sleep, steady meals, gratitude.",
  },
  oxytocin: {
    label: "Oxytocin",
    short: "Oxy",
    colorVar: "--hub-oxy",
    blurb: "Bonding: trust, closeness and quality time with people who matter.",
  },
  endorphins: {
    label: "Endorphins",
    short: "Endo",
    colorVar: "--hub-endo",
    blurb: "Euphoria from exertion, laughter and exciting things.",
  },
  endocannabinoids: {
    label: "Endocannabinoids",
    short: "eCB",
    colorVar: "--hub-ecb",
    blurb: "Bliss and ease: steady cardio, friendship, collaboration.",
  },
  gaba: {
    label: "GABA / Opioids",
    short: "GABA",
    colorVar: "--hub-gaba",
    blurb: "The brake pedal: rest, calm, deep gratification.",
  },
};

export const CUP_CAPACITY_DEFAULT = 10;

/** Classification vocabulary shared by calendar events and activities. */
export const KINDS_BY_DOMAIN = {
  work: ["ceo_block", "operating_review", "meeting", "shoot", "roles_action", "work_other"],
  body: ["training", "walk", "mobility", "recovery", "medical", "medication"],
  relationships: ["friend_plan", "family_touchpoint", "date", "quality_time", "helping"],
  aliveness: ["enjoyable", "memorable", "gig", "laughter", "nature", "travel", "reading"],
} as const satisfies Record<Domain, readonly string[]>;

export type Kind = (typeof KINDS_BY_DOMAIN)[Domain][number];

export type ActivityType = {
  id: string;
  label: string;
  domain: Domain | "none";
  kind: Kind | "none";
  drops: Drops;
  /** Max number of this type that earn drops per week (autopilot guard). */
  weeklyCap?: number;
  /** Where it usually comes from; "manual" means it appears in the Log sheet. */
  sources: Array<"manual" | "whoop" | "calendar" | "meals" | "monday" | "hub">;
  /** Shown in the Log sheet activity picker. */
  loggable?: boolean;
};

export const ACTIVITY_TYPES: ActivityType[] = [
  { id: "ceo_block", label: "CEO block", domain: "work", kind: "ceo_block", drops: { dopamine: 1, gaba: 1 }, sources: ["calendar", "manual"], loggable: true },
  { id: "operating_review", label: "Operating review", domain: "work", kind: "operating_review", drops: { dopamine: 1, endocannabinoids: 1 }, sources: ["calendar", "manual"], loggable: true },
  { id: "roles_action", label: "Roles action", domain: "work", kind: "roles_action", drops: { dopamine: 2, gaba: 1 }, sources: ["manual", "monday"], loggable: true },
  { id: "monday_done", label: "Roadmap item done", domain: "work", kind: "work_other", drops: { dopamine: 1 }, weeklyCap: 3, sources: ["monday"] },
  { id: "workshop", label: "Team workshop", domain: "work", kind: "meeting", drops: { oxytocin: 1, endocannabinoids: 1 }, sources: ["calendar"] },

  { id: "cardio", label: "Cardio session", domain: "body", kind: "training", drops: { dopamine: 1, endorphins: 2, endocannabinoids: 1 }, sources: ["whoop", "manual"], loggable: true },
  { id: "strength", label: "Strength session", domain: "body", kind: "training", drops: { dopamine: 1, endorphins: 1, gaba: 1 }, sources: ["whoop", "manual"], loggable: true },
  { id: "mixed", label: "Mixed session", domain: "body", kind: "training", drops: { dopamine: 1, endorphins: 2, endocannabinoids: 1 }, sources: ["whoop", "manual"], loggable: true },
  { id: "team_sport", label: "Team or racket sport", domain: "body", kind: "training", drops: { dopamine: 1, oxytocin: 1, endorphins: 2, endocannabinoids: 1 }, sources: ["whoop", "manual"], loggable: true },
  { id: "mobility", label: "Yoga / mobility", domain: "body", kind: "mobility", drops: { serotonin: 1, gaba: 2 }, sources: ["whoop", "manual"], loggable: true },
  { id: "walk", label: "Daylight walk", domain: "body", kind: "walk", drops: { serotonin: 1, endocannabinoids: 1 }, weeklyCap: 3, sources: ["whoop", "manual"], loggable: true },
  { id: "sleep_in_window", label: "Sleep in window", domain: "body", kind: "recovery", drops: { serotonin: 1, gaba: 1 }, weeklyCap: 4, sources: ["whoop"] },
  { id: "sleep_in_window_low", label: "Sleep in window (low performance)", domain: "body", kind: "recovery", drops: { gaba: 1 }, weeklyCap: 4, sources: ["whoop"] },
  { id: "consistent_meal_day", label: "Consistent meal day", domain: "body", kind: "recovery", drops: { serotonin: 1 }, weeklyCap: 2, sources: ["meals"] },
  { id: "meditation", label: "Meditation / breathwork", domain: "body", kind: "recovery", drops: { serotonin: 1, gaba: 2 }, sources: ["whoop", "manual"], loggable: true },
  { id: "sauna_cold", label: "Sauna / cold water", domain: "body", kind: "recovery", drops: { endorphins: 1, gaba: 1 }, sources: ["whoop", "manual"], loggable: true },
  { id: "massage", label: "Massage", domain: "body", kind: "recovery", drops: { oxytocin: 1, gaba: 1 }, sources: ["manual"], loggable: true },
  { id: "medication", label: "Medication", domain: "body", kind: "medication", drops: {}, sources: ["manual"] },

  { id: "friend_plan", label: "Friend plan", domain: "relationships", kind: "friend_plan", drops: { oxytocin: 2, endocannabinoids: 2 }, sources: ["calendar", "manual"], loggable: true },
  { id: "family_touchpoint", label: "Family / longstanding friend", domain: "relationships", kind: "family_touchpoint", drops: { serotonin: 1, oxytocin: 2 }, sources: ["manual", "calendar"], loggable: true },
  { id: "quality_time", label: "Quality time", domain: "relationships", kind: "quality_time", drops: { oxytocin: 2, endocannabinoids: 1, gaba: 1 }, sources: ["manual"], loggable: true },
  { id: "date", label: "Date", domain: "relationships", kind: "date", drops: { dopamine: 1, oxytocin: 2, endorphins: 1 }, sources: ["manual", "calendar"], loggable: true },
  { id: "helping", label: "Helping / mentoring", domain: "relationships", kind: "helping", drops: { serotonin: 1, oxytocin: 1 }, sources: ["manual"], loggable: true },

  { id: "enjoyable", label: "Enjoyable activity", domain: "aliveness", kind: "enjoyable", drops: { dopamine: 2, endorphins: 1, endocannabinoids: 2 }, sources: ["calendar", "whoop", "manual"], loggable: true },
  { id: "memorable", label: "Memorable experience", domain: "aliveness", kind: "memorable", drops: { dopamine: 3, oxytocin: 1, endorphins: 2, endocannabinoids: 1 }, sources: ["manual"], loggable: true },
  { id: "gig", label: "Gig / theatre / cinema", domain: "aliveness", kind: "gig", drops: { dopamine: 1, endorphins: 1, endocannabinoids: 1 }, sources: ["calendar", "manual"], loggable: true },
  { id: "laughter", label: "Laughter / comedy", domain: "aliveness", kind: "laughter", drops: { endorphins: 2, endocannabinoids: 1 }, sources: ["manual"], loggable: true },
  { id: "nature", label: "Nature / sea swim / sailing", domain: "aliveness", kind: "nature", drops: { dopamine: 1, serotonin: 2, endorphins: 1, endocannabinoids: 1 }, sources: ["whoop", "calendar", "manual"], loggable: true },
  { id: "travel", label: "Trip / travel day", domain: "aliveness", kind: "travel", drops: { dopamine: 1, endocannabinoids: 1 }, sources: ["calendar", "manual"], loggable: true },
  { id: "reading", label: "Reading / quiet leisure", domain: "aliveness", kind: "reading", drops: { gaba: 1 }, sources: ["manual"], loggable: true },

  { id: "checkin_gratitude", label: "Check-in with gratitude", domain: "none", kind: "none", drops: { serotonin: 1, gaba: 1 }, weeklyCap: 3, sources: ["manual"] },
  { id: "sunday_review", label: "Sunday review completed", domain: "none", kind: "none", drops: { dopamine: 1, gaba: 1 }, sources: ["hub"] },
];

export const ACTIVITY_TYPE_BY_ID: Record<string, ActivityType> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.id, t]),
);

export function dropsFor(typeId: string, overrides?: Record<string, Drops>): Drops {
  return overrides?.[typeId] ?? ACTIVITY_TYPE_BY_ID[typeId]?.drops ?? {};
}

/** Activity types that fill a given cup, best first. */
export function typesForCup(cup: Cup): ActivityType[] {
  return ACTIVITY_TYPES.filter((t) => (t.drops[cup] ?? 0) > 0).sort((a, b) => (b.drops[cup] ?? 0) - (a.drops[cup] ?? 0));
}
