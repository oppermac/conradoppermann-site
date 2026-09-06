import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { activities } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";

const Patch = z.object({
  title: z.string().max(120).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  memorable: z.boolean().optional(),
  people: z.array(z.string().min(1).max(60)).max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  durationMin: z.number().int().min(1).max(1440).nullable().optional(),
  void: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/hub/api/activities/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch", issues: parsed.error.issues }, { status: 400 });
  const [row] = await db.update(activities).set(parsed.data).where(eq(activities.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, activity: row });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/hub/api/activities/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  await db.delete(activities).where(eq(activities.id, id));
  return NextResponse.json({ ok: true });
}
