/**
 * Data for the Programme page: the four domain outcomes with weekly behaviours and cumulative
 * weeks-on-track, plus the Monday Roadmap 2026 mirror (goals + rocks).
 */
import { hasDb } from "../db/client";
import { weekFacts } from "../domain/facts";
import { BEHAVIOUR_META, ragAtEnd, worstRag, type BehaviourFacts, type Rag } from "../domain/kpis";
import { DOMAINS, DOMAIN_META, PROGRAMME_WEEK_1_START, PROGRAMME_WEEKS, programmePosition, type Domain } from "../domain/programme";
import { readRoadmap } from "../monday/sync";
import { DEFAULT_SETTINGS, getSettings } from "../settings";
import { addDays, dublin, localToUtc, type DayKey } from "../time";

export type ProgrammeDomain = {
  domain: Domain;
  label: string;
  outcome: string;
  rag: Rag;
  behaviours: Array<{ id: BehaviourFacts["id"]; label: string; done: number; target: number; scheduled: number }>;
  weeksOnTrack: number;
  weeksElapsed: number;
  progressStatement: string;
};

function progressStatement(weeksOnTrack: number, weeksElapsed: number): string {
  if (weeksElapsed === 0) return "The programme starts this week — nothing to measure yet.";
  if (weeksOnTrack === weeksElapsed) return `On track every week so far — ${weeksOnTrack} of ${weeksElapsed}.`;
  if (weeksOnTrack === 0) return `Not yet on track this programme — 0 of ${weeksElapsed} week${weeksElapsed === 1 ? "" : "s"} green.`;
  const pct = Math.round((weeksOnTrack / weeksElapsed) * 100);
  return `On track ${weeksOnTrack} of ${weeksElapsed} weeks so far (${pct}%).`;
}

export async function programmeData() {
  const now = new Date();
  const today = dublin(now).dayKey;
  const pos = programmePosition(today);

  if (!hasDb) {
    return { dbConnected: false as const, programme: pos, settings: DEFAULT_SETTINGS };
  }

  const { settings } = await getSettings();
  const thisWeekFacts = await weekFacts(today, settings, now);

  // Every completed week of the programme, most efficient to fetch once and slice per domain.
  const mondays: DayKey[] = [];
  for (let i = 0; i < PROGRAMME_WEEKS; i++) mondays.push(addDays(PROGRAMME_WEEK_1_START, i * 7));
  const factsPerElapsedWeek: BehaviourFacts[][] = [];
  for (const monday of mondays) {
    const weekEndAt = localToUtc(addDays(monday, 7), "00:00");
    if (weekEndAt > now) continue;
    factsPerElapsedWeek.push(await weekFacts(monday, settings, new Date(weekEndAt.getTime() - 1)));
  }

  const domains: ProgrammeDomain[] = DOMAINS.map((d) => {
    const weekly = thisWeekFacts.filter((f) => BEHAVIOUR_META[f.id].domain === d && BEHAVIOUR_META[f.id].period === "week");
    const rag = worstRag(weekly.map(ragAtEnd));
    let weeksOnTrack = 0;
    for (const facts of factsPerElapsedWeek) {
      const domainFacts = facts.filter((f) => BEHAVIOUR_META[f.id].domain === d && BEHAVIOUR_META[f.id].period === "week");
      if (domainFacts.length && worstRag(domainFacts.map(ragAtEnd)) === "green") weeksOnTrack += 1;
    }
    const weeksElapsed = factsPerElapsedWeek.length;
    return {
      domain: d,
      label: DOMAIN_META[d].label,
      outcome: DOMAIN_META[d].outcome,
      rag,
      behaviours: thisWeekFacts
        .filter((f) => BEHAVIOUR_META[f.id].domain === d)
        .map((f) => ({ id: f.id, label: BEHAVIOUR_META[f.id].label, done: f.done, target: f.target, scheduled: f.scheduled })),
      weeksOnTrack,
      weeksElapsed,
      progressStatement: progressStatement(weeksOnTrack, weeksElapsed),
    };
  });

  const roadmapRaw = await readRoadmap().catch(() => null);
  const roadmap = roadmapRaw
    ? {
        fetchedAt: roadmapRaw.fetchedAt.toISOString(),
        summary: roadmapRaw.summary,
        goals: roadmapRaw.items.filter((i) => i.group === "goals"),
        rocks: roadmapRaw.items.filter((i) => i.group === "rocks"),
      }
    : null;

  return { dbConnected: true as const, programme: pos, settings, domains, roadmap };
}

export type ProgrammeData = Awaited<ReturnType<typeof programmeData>>;
