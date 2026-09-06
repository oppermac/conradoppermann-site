import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { NotConnectedError, ReauthRequiredError } from "@/lib/hub/tokens";
import { listCalendars } from "@/lib/hub/google/calendar";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  try {
    const calendars = await listCalendars();
    return NextResponse.json({ calendars: calendars.map((c) => ({ id: c.id, summary: c.summary, primary: Boolean(c.primary), accessRole: c.accessRole })) });
  } catch (err) {
    if (err instanceof NotConnectedError || err instanceof ReauthRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
