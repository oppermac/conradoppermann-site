import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic } from "@/lib/hub/ai/anthropic";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { adviseMeal } from "@/lib/hub/coach/meal-advice";

export const maxDuration = 60;

const Body = z.object({ have: z.string().min(2).max(1000) });

/** "What should I eat?" from the Log menu: what's in the fridge → one meal sized to what's left of today. */
export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasAnthropic()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Say what you have first" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await adviseMeal(parsed.data.have.trim())) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
