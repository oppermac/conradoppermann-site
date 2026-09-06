import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { createHubEvent, upcomingEvents } from "@/lib/hub/google/sync";
import { NotConnectedError, ReauthRequiredError } from "@/lib/hub/tokens";

const Create = z.object({
  summary: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  hubKind: z.string().min(1).max(40),
});

export async function GET(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ events: [], dbConnected: false });
  const url = new URL(req.url);
  const from = new Date(url.searchParams.get("from") ?? Date.now() - 86400000);
  const to = new Date(url.searchParams.get("to") ?? Date.now() + 7 * 86400000);
  return NextResponse.json({ events: await upcomingEvents(from, to) });
}

/** Book a block in the private calendar (gap suggestions, coach, Log sheet). */
export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event", issues: parsed.error.issues }, { status: 400 });
  const { start, end, ...rest } = parsed.data;
  if (new Date(end) <= new Date(start)) return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  try {
    const created = await createHubEvent({ ...rest, start: new Date(start), end: new Date(end) });
    return NextResponse.json({ ok: true, event: created });
  } catch (err) {
    if (err instanceof NotConnectedError || err instanceof ReauthRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg.includes("private calendar") ? 400 : 502 });
  }
}
