/**
 * Nudges: deterministic rules decide *whether* and *what*; Haiku only phrases. Deduped via insights.dedupe_key,
 * capped per day, silent in quiet hours (bedtime excepted) and during a quiet week.
 */
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { and, eq, gte, sql } from "drizzle-orm";
import { anthropic, hasAnthropic } from "./anthropic";
import { MODELS } from "./models";
import { db } from "../db/client";
import { insights } from "../db/schema";
import { computeGapsAndSuggestions } from "../domain/engine";
import { dailyTotals } from "../meals/store";
import { notify } from "../notify/send";
import { getSettings, type Settings } from "../settings";
import { tokenStatus } from "../tokens";
import { minutesOfDay, weekKey, type DublinDateTime } from "../time";

export type NudgeCandidate = {
  rule: string;
  period: string;
  domain: string;
  facts: string;
  fallbackTitle: string;
  fallbackBody: string;
  url: string;
  ignoreQuietHours?: boolean;
};

function inQuietHours(now: DublinDateTime, s: Settings["notifications"]): boolean {
  const t = minutesOfDay(now.hhmm);
  const qs = minutesOfDay(s.quietStart);
  const qe = minutesOfDay(s.quietEnd);
  return qs > qe ? t >= qs || t < qe : t >= qs && t < qe;
}

const RISK_LABEL: Record<string, string> = {
  ceo_blocks: "CEO blocks",
  operating_review: "operating review",
  sessions: "training",
  friend_plans: "friend plans",
  family_touchpoint: "family touchpoint",
  enjoyable: "something enjoyable",
  memorable: "a memorable experience",
  meals: "consistent meals",
  bedtime: "bedtime",
};

export async function collectCandidates(now: DublinDateTime, settings: Settings): Promise<NudgeCandidate[]> {
  const out: NudgeCandidate[] = [];
  const wk = weekKey(now.dayKey);
  const { gaps, suggestions } = await computeGapsAndSuggestions();

  for (const g of gaps) {
    if (g.risk === "none") continue;
    const sug = suggestions.find((s) => s.gapIds.includes(g.id));
    const slot = sug?.slots[0]?.label;
    const period = g.id === "memorable" ? now.dayKey.slice(0, 7) : wk;
    out.push({
      rule: g.id,
      period,
      domain: g.domain,
      facts: `${RISK_LABEL[g.id]}: ${g.done} done, ${g.scheduled} scheduled, target ${g.target}; needs ${g.needs}.${sug ? ` Suggestion: ${sug.title}${sug.person ? ` (${sug.reason})` : ""}.` : ""}${slot ? ` Free slot: ${slot}.` : ""}`,
      fallbackTitle: sug?.title ?? `${RISK_LABEL[g.id][0].toUpperCase()}${RISK_LABEL[g.id].slice(1)} at risk`,
      fallbackBody: `${g.needs[0].toUpperCase()}${g.needs.slice(1)} still needed this week.${slot ? ` ${slot} is free.` : ""}`,
      url: "/hub",
    });
  }

  // Daily rhythms.
  const totals = await dailyTotals(now.dayKey);
  if (now.hour === 14 && totals.meals === 0) {
    out.push({ rule: "meals_not_logged", period: now.dayKey, domain: "body", facts: "No meals logged today by 14:00.", fallbackTitle: "Lunch not logged yet", fallbackBody: "A photo is enough.", url: "/hub/food" });
  }
  if (now.hour === 18 && settings.nutrition.proteinG && totals.proteinG < settings.nutrition.proteinG * 0.5) {
    out.push({
      rule: "protein_low",
      period: now.dayKey,
      domain: "body",
      facts: `Protein so far ${Math.round(totals.proteinG)} g of ${settings.nutrition.proteinG} g target by 18:30.`,
      fallbackTitle: "Protein is behind",
      fallbackBody: `${Math.round(totals.proteinG)} g of ${settings.nutrition.proteinG} g so far. Dinner can close most of it.`,
      url: "/hub/food",
    });
  }
  if (settings.notifications.bedtimeReminder && now.hour === 23 && now.minute < 30) {
    out.push({
      rule: "bedtime",
      period: now.dayKey,
      domain: "body",
      facts: `Bedtime window ${settings.sleep.bedtimeStart}–${settings.sleep.bedtimeEnd}.`,
      fallbackTitle: "Bedtime window",
      fallbackBody: `The window closes at ${settings.sleep.bedtimeEnd}.`,
      url: "/hub/body",
      ignoreQuietHours: true,
    });
  }
  for (const provider of ["whoop", "google"] as const) {
    const s = await tokenStatus(provider).catch(() => null);
    if (s?.connected && s.status === "reauth_required") {
      out.push({ rule: `${provider}_reauth`, period: now.dayKey, domain: "work", facts: `${provider} token expired.`, fallbackTitle: `Reconnect ${provider === "whoop" ? "Whoop" : "Google"}`, fallbackBody: "The connection needs a fresh sign-in in Settings.", url: "/hub/settings" });
    }
  }
  return out;
}

const Phrase = z.object({ title: z.string().max(40), body: z.string().max(120) });

async function phrase(c: NudgeCandidate): Promise<{ title: string; body: string }> {
  if (!hasAnthropic()) return { title: c.fallbackTitle, body: c.fallbackBody };
  try {
    const r = await anthropic().messages.parse({
      model: MODELS.phrase,
      max_tokens: 200,
      system: "Write a push notification for Conrad from the facts: title ≤ 40 characters, body ≤ 120 characters. Specific, warm, no exclamation marks, no guilt, name the person or slot if given, offer the action plainly.",
      messages: [{ role: "user", content: c.facts }],
      output_config: { format: zodOutputFormat(Phrase) },
    });
    return r.parsed_output ?? { title: c.fallbackTitle, body: c.fallbackBody };
  } catch {
    return { title: c.fallbackTitle, body: c.fallbackBody };
  }
}

export async function runNudges(now: DublinDateTime): Promise<{ sent: number; skipped: string[] }> {
  const { settings } = await getSettings();
  const n = settings.notifications;
  const skipped: string[] = [];
  const candidates = await collectCandidates(now, settings);
  const [{ count: sentToday }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(insights)
    .where(and(eq(insights.kind, "nudge"), gte(insights.forDate, now.dayKey)));
  let budget = Math.max(0, n.dailyCap - (sentToday ?? 0));
  let sent = 0;
  for (const c of candidates) {
    if (n.quietWeek && c.rule !== "bedtime") {
      skipped.push(`${c.rule}: quiet week`);
      continue;
    }
    if (!c.ignoreQuietHours && inQuietHours(now, n)) {
      skipped.push(`${c.rule}: quiet hours`);
      continue;
    }
    if (budget <= 0) {
      skipped.push(`${c.rule}: daily cap`);
      continue;
    }
    const dedupeKey = `nudge:${c.rule}:${c.period}`;
    const text = await phrase(c);
    const inserted = await db
      .insert(insights)
      .values({ kind: "nudge", forDate: now.dayKey, title: text.title, bodyMd: text.body, payload: { rule: c.rule, facts: c.facts, domain: c.domain }, model: MODELS.phrase, dedupeKey })
      .onConflictDoNothing()
      .returning({ id: insights.id });
    if (!inserted[0]) {
      skipped.push(`${c.rule}: already sent`);
      continue;
    }
    const res = await notify({ title: text.title, body: text.body, url: c.url, tag: c.rule });
    if (res.push || res.slack) await db.update(insights).set({ deliveredAt: new Date() }).where(eq(insights.id, inserted[0].id));
    sent += 1;
    budget -= 1;
  }
  return { sent, skipped };
}
