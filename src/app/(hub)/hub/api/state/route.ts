import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { buildContext } from "@/lib/hub/ai/context";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const ctx = await buildContext();
  const approxTokens = Math.round(JSON.stringify(ctx).length / 4);
  return NextResponse.json({ approxTokens, ...ctx });
}
