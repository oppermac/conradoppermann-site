import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { insights } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";

export async function GET(_req: Request, ctx: RouteContext<"/hub/api/insights/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  const [row] = await db.select().from(insights).where(eq(insights.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ insight: row });
}

export async function PATCH(_req: Request, ctx: RouteContext<"/hub/api/insights/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  await db.update(insights).set({ readAt: new Date() }).where(eq(insights.id, id));
  return NextResponse.json({ ok: true });
}
