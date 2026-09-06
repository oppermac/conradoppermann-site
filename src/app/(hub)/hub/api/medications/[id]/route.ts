import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { medicationLog } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";

export async function DELETE(_req: Request, ctx: RouteContext<"/hub/api/medications/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  await db.delete(medicationLog).where(eq(medicationLog.id, id));
  return NextResponse.json({ ok: true });
}
