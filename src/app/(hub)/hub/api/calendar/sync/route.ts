import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { NotConnectedError, ReauthRequiredError } from "@/lib/hub/tokens";
import { syncCalendars } from "@/lib/hub/google/sync";
import { classifyPending } from "@/lib/hub/google/classify";

export const maxDuration = 120;

export async function POST() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  try {
    const summary = await syncCalendars();
    const classified = await classifyPending();
    return NextResponse.json({ ok: true, ...summary, classified });
  } catch (err) {
    if (err instanceof NotConnectedError) return NextResponse.json({ error: "Google is not connected" }, { status: 409 });
    if (err instanceof ReauthRequiredError) return NextResponse.json({ error: "Google needs to be reconnected" }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
