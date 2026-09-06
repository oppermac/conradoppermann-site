import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { insights } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { generateBrief } from "@/lib/hub/ai/brief";
import { generateReview } from "@/lib/hub/ai/review";

export const maxDuration = 120;

export async function GET(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ insights: [], dbConnected: false });
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as "brief" | "review" | "nudge" | null;
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));
  const rows = kind
    ? await db.select().from(insights).where(eq(insights.kind, kind)).orderBy(desc(insights.createdAt)).limit(limit)
    : await db.select().from(insights).orderBy(desc(insights.createdAt)).limit(limit);
  return NextResponse.json({ insights: rows, dbConnected: true });
}

/** Regenerate on demand ("Regenerate brief" in Settings, or a first-run brief). */
export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { kind?: string; force?: boolean };
  try {
    if (body.kind === "review") return NextResponse.json({ ok: true, ...(await generateReview({ force: Boolean(body.force) })) });
    return NextResponse.json({ ok: true, ...(await generateBrief({ force: Boolean(body.force) })) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
