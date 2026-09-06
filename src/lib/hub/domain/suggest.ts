import { CUPS, type Cup } from "./activity-types";
import type { Gap } from "./gaps";
import type { SlotKind } from "./slots";

export type CupFill = { cup: Cup; drops: number; capacity: number };
export type PersonDue = {
  id: string;
  name: string;
  relationship: "family" | "longstanding" | "friend" | "team";
  cadenceDays: number;
  lastSeen: string | null;
  /** days since last seen minus cadence; positive = overdue */
  overdueDays: number;
  daysSince: number | null;
};

export type Suggestion = {
  key: string;
  title: string;
  reason: string;
  slotKind: SlotKind;
  typeId: string;
  person?: PersonDue;
  cups: Cup[];
  /** Which weekly gaps this would also close. */
  gapIds: Gap["id"][];
};

/** Cups whose fill is well behind the week's pace (from Wednesday on). */
export function cupsBelowPace(fills: CupFill[], elapsedDays: number): Cup[] {
  if (elapsedDays < 3) return [];
  const pace = elapsedDays / 7;
  return CUPS.filter((cup) => {
    const f = fills.find((x) => x.cup === cup);
    if (!f || f.capacity <= 0) return false;
    return f.drops / f.capacity < pace * 0.6;
  });
}

function mostOverdue(people: PersonDue[], rel?: PersonDue["relationship"][]): PersonDue | undefined {
  return people
    .filter((p) => !rel || rel.includes(p.relationship))
    .sort((a, b) => b.overdueDays - a.overdueDays)[0];
}

function seeText(p: PersonDue): string {
  if (p.daysSince === null) return `you haven't logged seeing ${p.name} yet`;
  const weeks = Math.round(p.daysSince / 7);
  return `you haven't seen ${p.name} in ${weeks >= 2 ? `${weeks} weeks` : `${p.daysSince} days`}`;
}

/**
 * Named suggestions for low cups and open gaps, deduped so one card can say
 * "Oxytocin is low and you haven't seen Mum in 3 weeks".
 */
export function buildSuggestions(opts: {
  gaps: Gap[];
  lowCups: Cup[];
  people: PersonDue[];
  alivenessList: string[];
}): Suggestion[] {
  const { gaps, lowCups, people, alivenessList } = opts;
  const out = new Map<string, Suggestion>();
  const add = (s: Suggestion) => {
    const existing = out.get(s.key);
    if (existing) {
      existing.cups = Array.from(new Set([...existing.cups, ...s.cups]));
      existing.gapIds = Array.from(new Set([...existing.gapIds, ...s.gapIds]));
      if (s.reason && !existing.reason.includes(s.reason)) existing.reason = `${existing.reason} ${s.reason}`.trim();
      return;
    }
    out.set(s.key, s);
  };

  for (const g of gaps) {
    if (!g.slotKind || !g.typeId) continue;
    switch (g.id) {
      case "friend_plans": {
        const p = mostOverdue(people, ["friend", "longstanding"]);
        add({
          key: p ? `person:${p.id}` : "friend_plan",
          title: p ? `See ${p.name}` : "Plan time with a friend",
          reason: `You need ${g.needs} this week.${p && p.overdueDays > 0 ? ` And ${seeText(p)}.` : ""}`,
          slotKind: "friend",
          typeId: "friend_plan",
          person: p,
          cups: ["oxytocin", "endocannabinoids"],
          gapIds: [g.id],
        });
        break;
      }
      case "family_touchpoint": {
        const p = mostOverdue(people, ["family", "longstanding"]);
        add({
          key: p ? `person:${p.id}` : "family_touchpoint",
          title: p ? `Call or see ${p.name}` : "A family touchpoint",
          reason: p && p.overdueDays > 0 ? `${seeText(p)[0].toUpperCase()}${seeText(p).slice(1)}.` : "No family touchpoint yet this week.",
          slotKind: "family",
          typeId: "family_touchpoint",
          person: p,
          cups: ["oxytocin", "serotonin"],
          gapIds: [g.id],
        });
        break;
      }
      case "sessions":
        add({
          key: "training",
          title: g.needs.includes("strength") && !g.needs.includes("cardio") ? "Strength session" : "Training session",
          reason: `You need ${g.needs} this week.`,
          slotKind: "training",
          typeId: g.needs.startsWith("1 strength") || g.needs.includes("strength session") ? "strength" : "cardio",
          cups: ["endorphins", "dopamine"],
          gapIds: [g.id],
        });
        break;
      case "ceo_blocks":
        add({ key: "ceo_block", title: "Book a CEO block", reason: `${g.needs} this week.`, slotKind: "ceo_block", typeId: "ceo_block", cups: ["dopamine"], gapIds: [g.id] });
        break;
      case "operating_review":
        add({ key: "operating_review", title: "Schedule the operating review", reason: "No operating review this week yet.", slotKind: "operating_review", typeId: "operating_review", cups: ["dopamine"], gapIds: [g.id] });
        break;
      case "enjoyable":
      case "memorable": {
        const idea = alivenessList[0];
        add({
          key: "enjoyable",
          title: idea ? idea : "Book something you'll enjoy",
          reason: g.id === "memorable" ? "Nothing memorable flagged this month yet." : "Nothing on the books for enjoyment this week.",
          slotKind: "enjoyable",
          typeId: g.typeId,
          cups: ["dopamine", "endocannabinoids"],
          gapIds: [g.id],
        });
        break;
      }
      default:
        break;
    }
  }

  for (const cup of lowCups) {
    switch (cup) {
      case "oxytocin": {
        const p = mostOverdue(people);
        add({
          key: p ? `person:${p.id}` : "quality_time",
          title: p ? `See ${p.name}` : "Quality time with someone close",
          reason: `Oxytocin is low${p && p.overdueDays > 0 ? ` and ${seeText(p)}` : ""}.`,
          slotKind: p?.relationship === "family" ? "family" : "friend",
          typeId: p?.relationship === "family" ? "family_touchpoint" : "friend_plan",
          person: p,
          cups: ["oxytocin"],
          gapIds: [],
        });
        break;
      }
      case "endorphins":
      case "endocannabinoids":
        add({ key: "training", title: "Cardio session", reason: `${cup === "endorphins" ? "Endorphins are" : "Endocannabinoids are"} low; steady cardio fills them fastest.`, slotKind: "training", typeId: "cardio", cups: [cup], gapIds: [] });
        break;
      case "dopamine":
        add({ key: "enjoyable", title: alivenessList[0] ?? "Book something you'll enjoy", reason: "Dopamine is low; finish a CEO block or book something you love.", slotKind: "enjoyable", typeId: "enjoyable", cups: ["dopamine"], gapIds: [] });
        break;
      case "serotonin":
        add({ key: "walk", title: "Daylight walk", reason: "Serotonin is low; daylight, an early night and logged meals help.", slotKind: "training", typeId: "walk", cups: ["serotonin"], gapIds: [] });
        break;
      case "gaba":
        add({ key: "rest", title: "An early night or breathwork", reason: "GABA is low; give the week a brake pedal.", slotKind: "rest", typeId: "meditation", cups: ["gaba"], gapIds: [] });
        break;
    }
  }
  return Array.from(out.values());
}
