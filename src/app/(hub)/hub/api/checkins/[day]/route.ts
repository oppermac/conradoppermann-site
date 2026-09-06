import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { checkins } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { setCheckin } from "@/lib/hub/domain/log";

const Body = z.object({
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  gratitude: z.string().max(300).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  weightKg: z.number().min(30).max(250).nullable().optional(),
  bedtimeLocal: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

export async function GET(_req: Request, ctx: RouteContext<"/hub/api/checkins/[day]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ checkin: null, dbConnected: false });
  const { day } = await ctx.params;
  const [row] = await db.select().from(checkins).where(eq(checkins.day, day)).limit(1);
  return NextResponse.json({ checkin: row ?? null, dbConnected: true });
}

export async function PUT(req: Request, ctx: RouteContext<"/hub/api/checkins/[day]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { day } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Bad day" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid check-in", issues: parsed.error.issues }, { status: 400 });
  return NextResponse.json({ ok: true, checkin: await setCheckin(day, parsed.data) });
}
