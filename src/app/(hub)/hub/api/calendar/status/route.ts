import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { calendarEvents } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { tokenStatus } from "@/lib/hub/tokens";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (!hasDb) return NextResponse.json({ configured, dbConnected: false, connected: false });
  const status = await tokenStatus("google");
  const [latest] = await db.select({ syncedAt: calendarEvents.syncedAt }).from(calendarEvents).orderBy(desc(calendarEvents.syncedAt)).limit(1);
  const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(calendarEvents).where(eq(calendarEvents.deleted, false));
  return NextResponse.json({ configured, dbConnected: true, ...status, lastSyncAt: latest?.syncedAt ?? null, events: count?.n ?? 0 });
}
