import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hasAnthropic } from "@/lib/hub/ai/anthropic";
import { db, hasDb } from "@/lib/hub/db/client";
import { conversations } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { runCoachTurn } from "@/lib/hub/coach/loop";
import { sseResponse } from "@/lib/hub/coach/sse";
import { dayKey } from "@/lib/hub/time";

export const maxDuration = 120;

/** POST { conversationId?, message } → SSE stream of CoachEvent. */
export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  if (!hasAnthropic()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { conversationId?: string; message?: string };
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  let conversationId = body.conversationId ?? null;
  if (conversationId) {
    const [c] = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (!c) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  } else {
    const [c] = await db.insert(conversations).values({ day: dayKey(), title: message.slice(0, 60) }).returning();
    conversationId = c.id;
  }
  const id = conversationId;
  return sseResponse((send) => runCoachTurn({ conversationId: id, userText: message, send }), id);
}
