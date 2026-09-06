import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { activities } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { logActivity } from "@/lib/hub/domain/log";
import { ACTIVITY_TYPES } from "@/lib/hub/domain/activity-types";
import { dayKey, addDays } from "@/lib/hub/time";

const Body = z.object({
  typeId: z.string().min(1),
  title: z.string().max(120).nullable().optional(),
  occurredAt: z.string().max(40).nullable().optional(),
  durationMin: z.number().int().min(1).max(1440).nullable().optional(),
  people: z.array(z.string().min(1).max(60)).max(10).nullable().optional(),
  memorable: z.boolean().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ activities: [], types: ACTIVITY_TYPES.filter((t) => t.loggable), dbConnected: false });
  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? dayKey();
  const from = url.searchParams.get("from") ?? addDays(to, -13);
  const rows = await db.select().from(activities).where(and(gte(activities.day, from), lte(activities.day, to), eq(activities.void, false))).orderBy(desc(activities.occurredAt)).limit(200);
  return NextResponse.json({ activities: rows, types: ACTIVITY_TYPES.filter((t) => t.loggable), dbConnected: true });
}

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid activity", issues: parsed.error.issues }, { status: 400 });
  try {
    const row = await logActivity({ ...parsed.data, source: "manual" });
    return NextResponse.json({ ok: true, activity: row });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
