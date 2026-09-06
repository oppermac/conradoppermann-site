import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { db, hasDb } from "@/lib/hub/db/client";
import { webhookEvents } from "@/lib/hub/db/schema";
import { processWhoopEvent, type WhoopWebhookEvent } from "@/lib/hub/whoop/sync";

const MAX_SKEW_MS = 5 * 60 * 1000;

function verify(raw: string, signature: string | null, timestamp: string | null): boolean {
  const secret = process.env.WHOOP_CLIENT_SECRET;
  if (!secret || !signature || !timestamp) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) return false;
  const expected = createHmac("sha256", secret).update(timestamp + raw).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text(); // must be the raw body for the HMAC to match
  if (!verify(raw, req.headers.get("x-whoop-signature"), req.headers.get("x-whoop-signature-timestamp"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  if (!hasDb) return NextResponse.json({ error: "database not connected" }, { status: 503 });
  let event: WhoopWebhookEvent;
  try {
    event = JSON.parse(raw) as WhoopWebhookEvent;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const rowId = event.trace_id ?? `${event.type}:${event.id}:${req.headers.get("x-whoop-signature-timestamp")}`;
  const inserted = await db
    .insert(webhookEvents)
    .values({ id: rowId, provider: "whoop", type: event.type, payload: event })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) return NextResponse.json({ ok: true, duplicate: true });
  after(() => processWhoopEvent(event, rowId));
  return NextResponse.json({ ok: true });
}
