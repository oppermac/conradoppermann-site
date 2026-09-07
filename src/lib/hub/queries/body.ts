import { and, desc, eq, gte } from "drizzle-orm";
import { db, hasDb } from "../db/client";
import { checkins, medicationLog, whoopCycles, whoopRecoveries, whoopSleeps, whoopWorkouts } from "../db/schema";
import { weekFacts } from "../domain/facts";
import { DEFAULT_SETTINGS, getSettings } from "../settings";
import { addDays, bedtimeStatus, dayKey as todayKey } from "../time";
import { tokenStatus } from "../tokens";

export async function bodyData() {
  const today = todayKey();
  if (!hasDb) return { dbConnected: false as const, connected: false, settings: DEFAULT_SETTINGS };
  const { settings } = await getSettings();
  const whoop = await tokenStatus("whoop").catch(() => ({ connected: false as const }));
  const since28 = addDays(today, -27);
  const since14 = addDays(today, -13);
  const window = { start: settings.sleep.bedtimeStart, end: settings.sleep.bedtimeEnd, graceMin: settings.sleep.graceMin };

  const [recovery, sleeps, recoveries28, cycles28, workouts, facts, meds, weights] = await Promise.all([
    db.select().from(whoopRecoveries).orderBy(desc(whoopRecoveries.cycleId)).limit(1).then((r) => r[0] ?? null),
    db.select().from(whoopSleeps).where(and(eq(whoopSleeps.nap, false), gte(whoopSleeps.day, since28))).orderBy(desc(whoopSleeps.end)).limit(28),
    db.select().from(whoopRecoveries).where(gte(whoopRecoveries.day, since28)).orderBy(whoopRecoveries.day),
    db.select().from(whoopCycles).where(gte(whoopCycles.day, since28)).orderBy(whoopCycles.day),
    db.select().from(whoopWorkouts).where(gte(whoopWorkouts.day, since14)).orderBy(desc(whoopWorkouts.start)),
    weekFacts(today, settings),
    db.select().from(medicationLog).where(gte(medicationLog.day, addDays(today, -29))).orderBy(desc(medicationLog.takenAt)).limit(60),
    db.select({ day: checkins.day, weightKg: checkins.weightKg }).from(checkins).where(gte(checkins.day, addDays(today, -89))).orderBy(checkins.day),
  ]);

  const lastNight = sleeps[0] ?? null;
  const sessions = facts.find((f) => f.id === "sessions");
  const latestCycle = cycles28[cycles28.length - 1] ?? null;
  const hoursOf = (s: (typeof sleeps)[number]) => (s.inBedMs ? Math.round(((s.inBedMs - (s.awakeMs ?? 0)) / 3600000) * 10) / 10 : null);

  return {
    dbConnected: true as const,
    connected: whoop.connected && whoop.status === "ok",
    needsReauth: whoop.connected && whoop.status === "reauth_required",
    settings,
    recovery: recovery ? { day: recovery.day, score: recovery.recoveryScore, hrv: recovery.hrv, rhr: recovery.rhr, spo2: recovery.spo2, skinTemp: recovery.skinTemp, state: recovery.scoreState } : null,
    lastNight: lastNight
      ? { day: lastNight.day, bedtime: lastNight.bedtimeLocal, wake: lastNight.wakeLocal, hours: hoursOf(lastNight), performance: lastNight.perfPct, efficiency: lastNight.effPct, consistency: lastNight.consistencyPct, disturbances: lastNight.disturbances, status: lastNight.bedtimeLocal ? bedtimeStatus(lastNight.bedtimeLocal, window) : null, state: lastNight.scoreState }
      : null,
    strain: latestCycle ? { day: latestCycle.day, value: latestCycle.strain, inProgress: latestCycle.end === null } : null,
    window,
    nights: sleeps
      .slice(0, 7)
      .reverse()
      .map((s) => ({ day: s.day, start: s.start.toISOString(), end: s.end.toISOString(), bedtime: s.bedtimeLocal, wake: s.wakeLocal, lightMs: s.lightMs ?? 0, swsMs: s.swsMs ?? 0, remMs: s.remMs ?? 0, awakeMs: s.awakeMs ?? 0, performance: s.perfPct, status: s.bedtimeLocal ? bedtimeStatus(s.bedtimeLocal, window) : null })),
    series: {
      recovery: recoveries28.map((r) => ({ day: r.day, value: r.recoveryScore })),
      hrv: recoveries28.map((r) => ({ day: r.day, value: r.hrv })),
      rhr: recoveries28.map((r) => ({ day: r.day, value: r.rhr })),
      sleepPerformance: [...sleeps].reverse().map((s) => ({ day: s.day, value: s.perfPct })),
      sleepConsistency: [...sleeps].reverse().map((s) => ({ day: s.day, value: s.consistencyPct })),
      strain: cycles28.filter((c) => c.end !== null).map((c) => ({ day: c.day, value: c.strain })),
    },
    workouts: workouts.map((w) => ({ id: w.id, day: w.day, start: w.start.toISOString(), sport: w.sportName, kind: w.kind, override: w.kindOverride, minutes: w.durationMin, strain: w.strain, counts: w.countsAsSession, state: w.scoreState })),
    sessions: sessions ? { done: sessions.done, target: sessions.target, cardio: sessions.cardioDone ?? 0, strength: sessions.strengthDone ?? 0, cardioTarget: sessions.cardioTarget ?? 2, strengthTarget: sessions.strengthTarget ?? 2, scheduled: sessions.scheduled } : null,
    medication: meds.map((m) => ({ id: m.id, name: m.name, dose: m.dose, takenAt: m.takenAt.toISOString(), day: m.day })),
    weights: [...weights.filter((w) => w.weightKg !== null).map((w) => ({ day: w.day, kg: w.weightKg as number })), ...(settings.nutrition.weightKg ? [{ day: settings.nutrition.derivedAt?.slice(0, 10) ?? today, kg: settings.nutrition.weightKg }] : [])].sort((a, b) => a.day.localeCompare(b.day)),
  };
}

export type BodyData = Awaited<ReturnType<typeof bodyData>>;
