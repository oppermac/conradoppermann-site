import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic } from "@/lib/hub/ai/anthropic";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { runQuickLog } from "@/lib/hub/coach/quick-log";

export const maxDuration = 120;

const Body = z.object({ text: z.string().min(2).max(2000) });

/** "Tell Claude" from the Log menu: free text in, logged meals/activities/medication/check-ins out. */
export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasAnthropic()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type something first" }, { status: 400 });
  try {
    const result = await runQuickLog(parsed.data.text.trim());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
