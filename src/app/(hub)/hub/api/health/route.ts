import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireSession } from "@/lib/hub/session";
import { envStatus } from "@/lib/hub/env";
import { dayKey } from "@/lib/hub/time";
import { db, hasDb } from "@/lib/hub/db/client";

async function dbStatus(): Promise<"ok" | "unavailable" | "error"> {
  if (!hasDb) return "unavailable";
  try {
    await db.execute(sql`select 1`);
    return "ok";
  } catch {
    return "error";
  }
}

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const env = Object.fromEntries(envStatus().map((e) => [e.key, e.set]));
  return NextResponse.json({
    ok: true,
    phase: 0,
    now: new Date().toISOString(),
    dublinDay: dayKey(),
    db: await dbStatus(),
    env,
  });
}
