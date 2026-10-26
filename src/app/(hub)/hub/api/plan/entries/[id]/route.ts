import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { removeEntry } from "@/lib/hub/meals/plan-store";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  await removeEntry(id);
  return NextResponse.json({ ok: true });
}
