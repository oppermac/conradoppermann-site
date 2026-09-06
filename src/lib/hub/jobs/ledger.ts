import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { jobRuns } from "../db/schema";

/** Claim (job, key) exactly once; failed runs may be retried up to three times. */
export async function claim(job: string, key: string): Promise<string | null> {
  const inserted = await db.insert(jobRuns).values({ job, key }).onConflictDoNothing().returning({ id: jobRuns.id });
  if (inserted[0]) return inserted[0].id;
  const retried = await db
    .update(jobRuns)
    .set({ attempts: sql`${jobRuns.attempts} + 1`, startedAt: new Date(), ok: null, finishedAt: null })
    .where(and(eq(jobRuns.job, job), eq(jobRuns.key, key), eq(jobRuns.ok, false), sql`${jobRuns.attempts} < 3`))
    .returning({ id: jobRuns.id });
  return retried[0]?.id ?? null;
}

export async function finish(id: string, ok: boolean, summary?: unknown, error?: string): Promise<void> {
  await db.update(jobRuns).set({ ok, finishedAt: new Date(), summary: summary ?? null, error: error ?? null }).where(eq(jobRuns.id, id));
}

export async function lastRuns(limit = 30) {
  return db.select().from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(limit);
}
