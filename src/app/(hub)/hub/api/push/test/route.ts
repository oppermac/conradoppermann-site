import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { notify } from "@/lib/hub/notify/send";

export async function POST() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const result = await notify({ title: "Hub", body: "Notifications are working.", url: "/hub", tag: "test" });
  return NextResponse.json({ ok: true, ...result });
}
