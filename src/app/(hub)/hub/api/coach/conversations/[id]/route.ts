import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { conversationMessages, conversations } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";

/** Messages rendered for the client: text blocks, tool calls and results, and any pending confirmation. */
export async function GET(_req: Request, ctx: RouteContext<"/hub/api/coach/conversations/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  const [c] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, id)).orderBy(asc(conversationMessages.createdAt));
  const messages = rows.map((r) => ({ id: r.id, role: r.role, createdAt: r.createdAt.toISOString(), blocks: (Array.isArray(r.content) ? r.content : []) as Array<Record<string, unknown>> }));
  const last = rows[rows.length - 1];
  const lastBlocks = (Array.isArray(last?.content) ? last.content : []) as Array<Record<string, unknown>>;
  const pending = last?.role === "assistant" ? lastBlocks.find((b) => b.type === "tool_use" && b.name === "create_calendar_block") : undefined;
  return NextResponse.json({ conversation: c, messages, pending: pending ? { id: pending.id, name: pending.name, input: pending.input } : null });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/hub/api/coach/conversations/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  await db.delete(conversations).where(eq(conversations.id, id));
  return NextResponse.json({ ok: true });
}
