import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { whoopCycles, whoopSleeps, whoopWorkouts } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { tokenStatus } from "@/lib/hub/tokens";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const configured = Boolean(process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET);
  if (!hasDb) return NextResponse.json({ configured, dbConnected: false, connected: false });
  const status = await tokenStatus("whoop");
  const [latest] = await db.select({ updatedAt: whoopCycles.updatedAt }).from(whoopCycles).orderBy(desc(whoopCycles.updatedAt)).limit(1);
  const [[c], [s], [w]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(whoopCycles),
    db.select({ n: sql<number>`count(*)::int` }).from(whoopSleeps),
    db.select({ n: sql<number>`count(*)::int` }).from(whoopWorkouts),
  ]);
  return NextResponse.json({
    configured,
    dbConnected: true,
    ...status,
    lastSyncAt: latest?.updatedAt ?? null,
    counts: { cycles: c?.n ?? 0, sleeps: s?.n ?? 0, workouts: w?.n ?? 0 },
  });
}
