import { hasDb } from "../db/client";
import { dublin } from "../time";
import { claim, finish } from "./ledger";
import { JOBS } from "./registry";
import "../ai/jobs"; // registers brief / review / nudges when present

export type TickResult = {
  local: string;
  ran: Array<{ job: string; key: string; ms: number; summary?: unknown }>;
  skipped: string[];
  failed: Array<{ job: string; error: string }>;
};

/** One dispatcher for every scheduled job: Dublin local time, idempotent per (job, key). */
export async function tick(opts: { only?: string | null; force?: boolean } = {}): Promise<TickResult> {
  const now = dublin();
  const result: TickResult = { local: `${now.dayKey} ${now.hhmm}`, ran: [], skipped: [], failed: [] };
  if (!hasDb) {
    result.skipped.push("database not connected");
    return result;
  }
  for (const job of JOBS) {
    if (opts.only && job.name !== opts.only) continue;
    const dueKey = job.due(now);
    const key = opts.force ? `${dueKey ?? now.dayKey}:manual:${Date.now()}` : dueKey;
    if (!key) {
      result.skipped.push(job.name);
      continue;
    }
    const runId = await claim(job.name, key);
    if (!runId) {
      result.skipped.push(`${job.name} (already ran ${key})`);
      continue;
    }
    const started = Date.now();
    try {
      const summary = await job.run({ now, force: Boolean(opts.force) });
      await finish(runId, true, summary);
      result.ran.push({ job: job.name, key, ms: Date.now() - started, summary });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await finish(runId, false, undefined, msg.slice(0, 500));
      result.failed.push({ job: job.name, error: msg });
    }
  }
  return result;
}
