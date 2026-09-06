import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { NotConnectedError, ReauthRequiredError } from "@/lib/hub/tokens";
import { backfillProgramme, syncSince } from "@/lib/hub/whoop/sync";

export const maxDuration = 120;

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const url = new URL(req.url);
  const days = Math.min(120, Math.max(1, Number(url.searchParams.get("days") ?? 3)));
  const full = url.searchParams.get("full") === "1";
  try {
    const summary = full ? await backfillProgramme() : await syncSince(days);
    return NextResponse.json({ ok: true, days: full ? "programme" : days, ...summary });
  } catch (err) {
    if (err instanceof NotConnectedError) return NextResponse.json({ error: "Whoop is not connected" }, { status: 409 });
    if (err instanceof ReauthRequiredError) return NextResponse.json({ error: "Whoop needs to be reconnected" }, { status: 409 });
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
