import { NextResponse } from "next/server";
import { requireSession } from "@/lib/hub/session";
import { envStatus } from "@/lib/hub/env";
import { dublinDayKey } from "@/lib/hub/time";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const env = Object.fromEntries(envStatus().map((e) => [e.key, e.set]));
  return NextResponse.json({
    ok: true,
    phase: 0,
    now: new Date().toISOString(),
    dublinDay: dublinDayKey(),
    env,
  });
}
