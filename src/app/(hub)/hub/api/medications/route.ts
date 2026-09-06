import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, gte } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { medicationLog } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { dayKey } from "@/lib/hub/time";

const Body = z.object({
  name: z.string().min(1).max(80),
  dose: z.string().max(60).nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
  takenAt: z.string().datetime({ offset: true }).optional(),
  source: z.enum(["manual", "coach", "mcp"]).optional().default("manual"),
});

export async function GET(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ entries: [], dbConnected: false });
  const days = Math.min(365, Number(new URL(req.url).searchParams.get("days") ?? 30));
  const since = dayKey(new Date(Date.now() - days * 86400000));
  const entries = await db.select().from(medicationLog).where(gte(medicationLog.day, since)).orderBy(desc(medicationLog.takenAt)).limit(200);
  return NextResponse.json({ entries, dbConnected: true });
}

/** "I took X" → a line in the list. Nothing more. */
export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const takenAt = parsed.data.takenAt ? new Date(parsed.data.takenAt) : new Date();
  const [row] = await db
    .insert(medicationLog)
    .values({ takenAt, day: dayKey(takenAt), name: parsed.data.name, dose: parsed.data.dose ?? null, notes: parsed.data.notes ?? null, source: parsed.data.source })
    .returning();
  return NextResponse.json({ ok: true, entry: row });
}
