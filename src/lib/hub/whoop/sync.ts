import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  activities,
  checkins,
  webhookEvents,
  whoopCycles,
  whoopRecoveries,
  whoopSleeps,
  whoopWorkouts,
  type WorkoutKind,
} from "../db/schema";
import { ACTIVITY_TYPE_BY_ID } from "../domain/activity-types";
import { PROGRAMME_START } from "../domain/programme";
import { getSettings, updateSettings, type Settings } from "../settings";
import { addDays, bedtimeStatus, dayKey, localToUtc } from "../time";
import { whoopApi, type WhoopCycle, type WhoopRecovery, type WhoopSleep, type WhoopWorkout } from "./client";
import { classifySport, decideSession, durationMinutes, localDayFor, localHHMM } from "./map";

export type SyncSummary = { cycles: number; recoveries: number; sleeps: number; workouts: number };

export async function upsertCycles(rows: WhoopCycle[]): Promise<number> {
  for (const c of rows) {
    await db
      .insert(whoopCycles)
      .values({
        id: c.id,
        start: new Date(c.start),
        end: c.end ? new Date(c.end) : null,
        timezoneOffset: c.timezone_offset,
        scoreState: c.score_state,
        strain: c.score?.strain ?? null,
        kilojoule: c.score?.kilojoule ?? null,
        avgHr: c.score?.average_heart_rate ?? null,
        maxHr: c.score?.max_heart_rate ?? null,
        day: localDayFor(c.start, c.timezone_offset),
        raw: c,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: whoopCycles.id,
        set: {
          start: new Date(c.start),
          end: c.end ? new Date(c.end) : null,
          timezoneOffset: c.timezone_offset,
          scoreState: c.score_state,
          strain: c.score?.strain ?? null,
          kilojoule: c.score?.kilojoule ?? null,
          avgHr: c.score?.average_heart_rate ?? null,
          maxHr: c.score?.max_heart_rate ?? null,
          day: localDayFor(c.start, c.timezone_offset),
          raw: c,
          updatedAt: new Date(),
        },
      });
  }
  return rows.length;
}

export async function upsertRecoveries(rows: WhoopRecovery[]): Promise<number> {
  for (const r of rows) {
    const [cycle] = await db.select({ day: whoopCycles.day }).from(whoopCycles).where(eq(whoopCycles.id, r.cycle_id)).limit(1);
    const day = cycle?.day ?? dayKey(new Date(r.created_at));
    const values = {
      cycleId: r.cycle_id,
      sleepId: r.sleep_id ?? null,
      scoreState: r.score_state,
      recoveryScore: r.score?.recovery_score ?? null,
      rhr: r.score?.resting_heart_rate ?? null,
      hrv: r.score?.hrv_rmssd_milli ?? null,
      spo2: r.score?.spo2_percentage ?? null,
      skinTemp: r.score?.skin_temp_celsius ?? null,
      day,
      raw: r,
      updatedAt: new Date(),
    };
    await db.insert(whoopRecoveries).values(values).onConflictDoUpdate({ target: whoopRecoveries.cycleId, set: values });
  }
  return rows.length;
}

/** Night key: the local day the sleep started, or the previous day for post-midnight bedtimes. */
export function nightDayOf(startIso: string, tz: string | null | undefined): string {
  const startDay = localDayFor(startIso, tz);
  const hhmm = localHHMM(startIso, tz);
  return hhmm < "12:00" ? addDays(startDay, -1) : startDay;
}

export async function upsertSleeps(rows: WhoopSleep[], settings: Settings): Promise<number> {
  for (const s of rows) {
    const st = s.score?.stage_summary;
    const values = {
      id: s.id,
      cycleId: s.cycle_id ?? null,
      start: new Date(s.start),
      end: new Date(s.end),
      nap: s.nap,
      timezoneOffset: s.timezone_offset,
      scoreState: s.score_state,
      inBedMs: st?.total_in_bed_time_milli ?? null,
      awakeMs: st?.total_awake_time_milli ?? null,
      lightMs: st?.total_light_sleep_time_milli ?? null,
      swsMs: st?.total_slow_wave_sleep_time_milli ?? null,
      remMs: st?.total_rem_sleep_time_milli ?? null,
      cycleCount: st?.sleep_cycle_count ?? null,
      disturbances: st?.disturbance_count ?? null,
      perfPct: s.score?.sleep_performance_percentage ?? null,
      effPct: s.score?.sleep_efficiency_percentage ?? null,
      consistencyPct: s.score?.sleep_consistency_percentage ?? null,
      respRate: s.score?.respiratory_rate ?? null,
      bedtimeLocal: localHHMM(s.start, s.timezone_offset),
      wakeLocal: localHHMM(s.end, s.timezone_offset),
      day: localDayFor(s.end, s.timezone_offset),
      raw: s,
      updatedAt: new Date(),
    };
    await db.insert(whoopSleeps).values(values).onConflictDoUpdate({ target: whoopSleeps.id, set: values });

    if (!s.nap) {
      const night = nightDayOf(s.start, s.timezone_offset);
      const bedtime = values.bedtimeLocal;
      const status = bedtimeStatus(bedtime, {
        start: settings.sleep.bedtimeStart,
        end: settings.sleep.bedtimeEnd,
        graceMin: settings.sleep.graceMin,
      });
      await db
        .insert(checkins)
        .values({ day: night, bedtimeLocal: bedtime, bedtimeStatus: status, bedtimeSource: "whoop" })
        .onConflictDoUpdate({
          target: checkins.day,
          set: { bedtimeLocal: bedtime, bedtimeStatus: status, bedtimeSource: "whoop", updatedAt: new Date() },
        });
    }
  }
  return rows.length;
}

async function existingOverride(id: string): Promise<WorkoutKind | null> {
  const [row] = await db.select({ kindOverride: whoopWorkouts.kindOverride }).from(whoopWorkouts).where(eq(whoopWorkouts.id, id)).limit(1);
  return row?.kindOverride ?? null;
}

export async function upsertWorkouts(rows: WhoopWorkout[], settings: Settings): Promise<number> {
  for (const w of rows) {
    const override = await existingOverride(w.id);
    const cls = override ? { kind: override } : classifySport(w.sport_name, settings.whoop.sportKinds);
    const minutes = durationMinutes(w.start, w.end);
    const decision = decideSession(cls, w.sport_name, minutes, w.score?.strain, settings.targets.body);
    const day = localDayFor(w.start, w.timezone_offset);
    const values = {
      id: w.id,
      start: new Date(w.start),
      end: new Date(w.end),
      timezoneOffset: w.timezone_offset,
      sportName: w.sport_name ?? null,
      sportId: w.sport_id ?? null,
      scoreState: w.score_state,
      strain: w.score?.strain ?? null,
      avgHr: w.score?.average_heart_rate ?? null,
      maxHr: w.score?.max_heart_rate ?? null,
      kilojoule: w.score?.kilojoule ?? null,
      distanceM: w.score?.distance_meter ?? null,
      zoneMs: w.score?.zone_durations ?? null,
      durationMin: minutes,
      kind: decision.effectiveKind,
      countsAsSession: decision.countsAsSession,
      day,
      raw: w,
      updatedAt: new Date(),
    };
    await db.insert(whoopWorkouts).values(values).onConflictDoUpdate({ target: whoopWorkouts.id, set: values });
    await syncWorkoutActivity(w.id, {
      typeId: decision.typeId,
      start: new Date(w.start),
      day,
      minutes,
      title: w.sport_name ?? "Workout",
    });
  }
  return rows.length;
}

/** Keep the activities row for a workout in step with its classification (user edits survive). */
async function syncWorkoutActivity(
  workoutId: string,
  info: { typeId: string | null; start: Date; day: string; minutes: number; title: string },
) {
  if (!info.typeId) {
    await db.update(activities).set({ void: true }).where(eq(activities.whoopWorkoutId, workoutId));
    return;
  }
  const type = ACTIVITY_TYPE_BY_ID[info.typeId];
  if (!type || type.domain === "none") return;
  const values = {
    occurredAt: info.start,
    day: info.day,
    domain: type.domain,
    kind: type.kind,
    typeId: type.id,
    title: info.title,
    durationMin: info.minutes,
    weights: type.drops,
    source: "whoop" as const,
    whoopWorkoutId: workoutId,
  };
  await db
    .insert(activities)
    .values(values)
    .onConflictDoUpdate({
      target: activities.whoopWorkoutId,
      targetWhere: sql`whoop_workout_id is not null`,
      set: {
        occurredAt: values.occurredAt,
        day: values.day,
        domain: values.domain,
        kind: values.kind,
        typeId: values.typeId,
        durationMin: values.durationMin,
        weights: values.weights,
        void: false,
      },
    });
}

export async function syncRange(startIso: string, endIso?: string): Promise<SyncSummary> {
  const { settings } = await getSettings();
  const [cycles, recoveries, sleeps, workouts] = await Promise.all([
    whoopApi.cycles(startIso, endIso),
    whoopApi.recoveries(startIso, endIso),
    whoopApi.sleeps(startIso, endIso),
    whoopApi.workouts(startIso, endIso),
  ]);
  const summary: SyncSummary = { cycles: 0, recoveries: 0, sleeps: 0, workouts: 0 };
  summary.cycles = await upsertCycles(cycles);
  summary.recoveries = await upsertRecoveries(recoveries);
  summary.sleeps = await upsertSleeps(sleeps, settings);
  summary.workouts = await upsertWorkouts(workouts, settings);
  return summary;
}

export function syncSince(days: number): Promise<SyncSummary> {
  const start = new Date(Date.now() - days * 86400000).toISOString();
  return syncRange(start);
}

/** Initial backfill: a week before the programme start so the first cycles/recoveries are complete. */
export function backfillProgramme(): Promise<SyncSummary> {
  return syncRange(localToUtc(addDays(PROGRAMME_START, -7), "00:00").toISOString());
}

export async function refreshWorkout(id: string): Promise<void> {
  const { settings } = await getSettings();
  await upsertWorkouts([await whoopApi.workout(id)], settings);
}

export async function refreshSleep(id: string): Promise<void> {
  const { settings } = await getSettings();
  await upsertSleeps([await whoopApi.sleep(id)], settings);
}

export async function refreshRecentRecoveries(hours = 48): Promise<number> {
  const start = new Date(Date.now() - hours * 3600000).toISOString();
  const [cycles, recoveries] = await Promise.all([whoopApi.cycles(start), whoopApi.recoveries(start)]);
  await upsertCycles(cycles);
  return upsertRecoveries(recoveries);
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.update(activities).set({ void: true }).where(eq(activities.whoopWorkoutId, id));
  await db.delete(whoopWorkouts).where(eq(whoopWorkouts.id, id));
}

export async function deleteSleep(id: string): Promise<void> {
  await db.delete(whoopSleeps).where(eq(whoopSleeps.id, id));
}

export type WhoopWebhookEvent = { user_id: number; id: string | number; type: string; trace_id?: string };

export async function processWhoopEvent(event: WhoopWebhookEvent, rowId: string): Promise<void> {
  const id = String(event.id);
  try {
    switch (event.type) {
      case "workout.updated":
        await refreshWorkout(id);
        break;
      case "workout.deleted":
        await deleteWorkout(id);
        break;
      case "sleep.updated":
        await refreshSleep(id);
        break;
      case "sleep.deleted":
        await deleteSleep(id);
        break;
      case "recovery.updated":
      case "recovery.deleted":
        await refreshRecentRecoveries(48);
        break;
      default:
        break;
    }
    await db.update(webhookEvents).set({ processedAt: new Date(), error: null }).where(eq(webhookEvents.id, rowId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(webhookEvents).set({ processedAt: new Date(), error: msg.slice(0, 500) }).where(eq(webhookEvents.id, rowId));
  }
}

/** Manual reclassification from the Body page; remembered for that sport name. */
export async function applyKindOverride(workoutId: string, kind: WorkoutKind): Promise<void> {
  const [row] = await db.select().from(whoopWorkouts).where(eq(whoopWorkouts.id, workoutId)).limit(1);
  if (!row) throw new Error("Workout not found");
  const { settings } = await getSettings();
  const sport = (row.sportName ?? "").trim().toLowerCase();
  if (sport) {
    await updateSettings({ whoop: { sportKinds: { ...settings.whoop.sportKinds, [sport]: kind } } });
  }
  const decision = decideSession({ kind }, row.sportName, row.durationMin, row.strain, settings.targets.body);
  await db
    .update(whoopWorkouts)
    .set({ kindOverride: kind, kind: decision.effectiveKind, countsAsSession: decision.countsAsSession, updatedAt: new Date() })
    .where(eq(whoopWorkouts.id, workoutId));
  await syncWorkoutActivity(workoutId, {
    typeId: decision.typeId,
    start: row.start,
    day: row.day,
    minutes: row.durationMin,
    title: row.sportName ?? "Workout",
  });
}
