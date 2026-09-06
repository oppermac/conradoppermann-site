import { BEHAVIOUR_META, gapOf, riskNow, type BehaviourFacts, type BehaviourId, type RiskLevel } from "./kpis";
import { DOMAINS, type Domain } from "./programme";
import type { SlotKind } from "./slots";
import type { DublinDateTime } from "../time";

export type Gap = {
  id: BehaviourId;
  domain: Domain;
  label: string;
  target: number;
  done: number;
  scheduled: number;
  gap: number;
  risk: RiskLevel;
  /** What kind of slot would close it; null for habits (meals, bedtime). */
  slotKind: SlotKind | null;
  /** Activity type to log/create for one unit of the gap. */
  typeId: string | null;
  needs: string;
};

const SLOT_FOR: Record<BehaviourId, SlotKind | null> = {
  ceo_blocks: "ceo_block",
  operating_review: "operating_review",
  sessions: "training",
  meals: null,
  bedtime: null,
  friend_plans: "friend",
  family_touchpoint: "family",
  enjoyable: "enjoyable",
  memorable: "enjoyable",
};

const TYPE_FOR: Record<BehaviourId, string | null> = {
  ceo_blocks: "ceo_block",
  operating_review: "operating_review",
  sessions: "cardio",
  meals: null,
  bedtime: null,
  friend_plans: "friend_plan",
  family_touchpoint: "family_touchpoint",
  enjoyable: "enjoyable",
  memorable: "memorable",
};

function plural(n: number, unit: string, one = unit.replace(/s$/, "")): string {
  return `${n} ${n === 1 ? one : unit}`;
}

function needsText(f: BehaviourFacts, gap: number): string {
  switch (f.id) {
    case "sessions": {
      const cardioGap = Math.max(0, (f.cardioTarget ?? 2) - (f.cardioDone ?? 0));
      const strengthGap = Math.max(0, (f.strengthTarget ?? 2) - (f.strengthDone ?? 0));
      const parts: string[] = [];
      if (strengthGap > 0) parts.push(plural(strengthGap, "strength sessions", "strength session"));
      if (cardioGap > 0) parts.push(plural(cardioGap, "cardio sessions", "cardio session"));
      return parts.length ? parts.join(" and ") : plural(gap, "more sessions", "more session");
    }
    case "ceo_blocks":
      return plural(gap, "more CEO blocks", "more CEO block");
    case "operating_review":
      return "an operating review";
    case "meals":
      return plural(gap, "more consistent meal days", "more consistent meal day");
    case "bedtime":
      return plural(gap, "more nights in the bedtime window", "more night in the bedtime window");
    case "friend_plans":
      return plural(gap, "friend plans", "friend plan");
    case "family_touchpoint":
      return "a family or longstanding-friend touchpoint";
    case "enjoyable":
      return "something genuinely enjoyable";
    case "memorable":
      return "a memorable experience this month";
  }
}

const RISK_ORDER: Record<RiskLevel, number> = { red: 0, amber: 1, none: 2 };

/** Gaps for the current week (and month for memorable), most urgent first. Only behaviours with a shortfall. */
export function computeGaps(facts: BehaviourFacts[], now: DublinDateTime): Gap[] {
  const gaps: Gap[] = [];
  for (const f of facts) {
    const gap = gapOf(f);
    if (gap <= 0) continue;
    const meta = BEHAVIOUR_META[f.id];
    gaps.push({
      id: f.id,
      domain: meta.domain,
      label: meta.label,
      target: f.target,
      done: f.done,
      scheduled: f.scheduled,
      gap,
      risk: riskNow(f, now.weekday, now.hour, now.day),
      slotKind: SLOT_FOR[f.id],
      typeId: TYPE_FOR[f.id],
      needs: needsText(f, gap),
    });
  }
  return gaps.sort(
    (a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain),
  );
}
