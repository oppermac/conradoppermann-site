import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic } from "@/lib/hub/ai/anthropic";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { resumeAfterAction } from "@/lib/hub/coach/loop";
import { sseResponse } from "@/lib/hub/coach/sse";

export const maxDuration = 120;

const Body = z.object({
  conversationId: z.string().uuid(),
  toolUseId: z.string().min(1),
  decision: z.enum(["confirm", "cancel"]),
  input: z.record(z.string(), z.unknown()).optional(),
});

/** Confirm or cancel a paused coach action (calendar writes) → SSE stream continuing the turn. */
export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  if (!hasAnthropic()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action", issues: parsed.error.issues }, { status: 400 });
  const { conversationId, toolUseId, decision, input } = parsed.data;
  return sseResponse((send) => resumeAfterAction({ conversationId, toolUseId, decision, input, send }), conversationId);
}
