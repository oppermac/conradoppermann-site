import type { DublinDateTime } from "../time";
import { weekKey } from "../time";
import { recomputeNutritionTargets } from "../domain/targets";
import { evaluateCupsForWeek } from "../domain/cups";
import { classifyPending } from "../google/classify";
import { syncCalendars } from "../google/sync";
import { syncMonday } from "../monday/sync";
import { getSettings } from "../settings";
import { tokenStatus } from "../tokens";
import { syncSince } from "../whoop/sync";

export type JobContext = { now: DublinDateTime; force: boolean };
export type Job = {
  name: string;
  /** Returns an idempotency key when due, or null. */
  due: (now: DublinDateTime) => string | null;
  run: (ctx: JobContext) => Promise<unknown>;
};

const quarter = (now: DublinDateTime) => `${now.dayKey}T${String(now.hour).padStart(2, "0")}:${Math.floor(now.minute / 15)}`;
const half = (now: DublinDateTime) => `${now.dayKey}T${String(now.hour).padStart(2, "0")}:${Math.floor(now.minute / 30)}`;
const hourKey = (now: DublinDateTime) => `${now.dayKey}T${String(now.hour).padStart(2, "0")}`;
const inWindow = (now: DublinDateTime, hour: number, minutes = 30) => now.hour === hour && now.minute < minutes;

async function connected(provider: "whoop" | "google"): Promise<boolean> {
  try {
    const s = await tokenStatus(provider);
    return s.connected && s.status === "ok";
  } catch {
    return false;
  }
}

/** Extra jobs (brief, review, nudges) register themselves from the intelligence module. */
export const JOBS: Job[] = [
  {
    name: "gcal.sync",
    due: (now) => quarter(now),
    run: async () => {
      if (!(await connected("google"))) return { skipped: "google not connected" };
      const sync = await syncCalendars();
      const classified = await classifyPending();
      return { ...sync, classified };
    },
  },
  {
    name: "monday.sync",
    due: (now) => half(now),
    run: async () => {
      if (!process.env.MONDAY_API_TOKEN) return { skipped: "no token" };
      return syncMonday();
    },
  },
  {
    name: "whoop.backfill",
    due: (now) => (now.hour % 2 === 0 ? hourKey(now) : null),
    run: async () => {
      if (!(await connected("whoop"))) return { skipped: "whoop not connected" };
      return syncSince(3);
    },
  },
  {
    name: "whoop.reconcile.deep",
    due: (now) => (now.hour === 4 ? now.dayKey : null),
    run: async () => {
      if (!(await connected("whoop"))) return { skipped: "whoop not connected" };
      return syncSince(7);
    },
  },
  {
    name: "targets.derive",
    due: (now) => (now.weekday === 1 && now.hour === 5 ? now.dayKey : null),
    run: async () => {
      if (!(await connected("whoop"))) return { skipped: "whoop not connected" };
      return recomputeNutritionTargets();
    },
  },
  {
    name: "cups.evaluate",
    due: (now) => quarter(now),
    run: async ({ now }) => {
      const { settings } = await getSettings();
      const thisWeek = weekKey(now.dayKey);
      const r1 = await evaluateCupsForWeek(thisWeek, settings);
      // Re-evaluate last week too for the first two days (late Whoop scores, Sunday logs).
      if (now.weekday <= 2) {
        const lastWeek = weekKey(new Date(new Date(now.dayKey).getTime() - 7 * 86400000).toISOString().slice(0, 10));
        const r2 = await evaluateCupsForWeek(lastWeek, settings);
        return { thisWeek: r1, lastWeek: r2 };
      }
      return { thisWeek: r1 };
    },
  },
];

export function registerJob(job: Job): void {
  if (!JOBS.some((j) => j.name === job.name)) JOBS.push(job);
}

export const _inWindow = inWindow;
