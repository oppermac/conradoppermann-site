import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, hasDb } from "@/lib/hub/db/client";
import { people } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PersonPatchBody = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  relationship: z.enum(["family", "longstanding", "friend", "team"]).optional(),
  cadenceDays: z.number().int().min(1).max(365).optional(),
  aliases: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/hub/api/people/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = PersonPatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const [row] = await db
    .update(people)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(people.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ person: row });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/hub/api/people/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [row] = await db.delete(people).where(eq(people.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
