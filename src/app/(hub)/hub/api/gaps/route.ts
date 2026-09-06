import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { computeGapsAndSuggestions } from "@/lib/hub/domain/engine";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ gaps: [], suggestions: [], dbConnected: false });
  return NextResponse.json({ ...(await computeGapsAndSuggestions()), dbConnected: true });
}
