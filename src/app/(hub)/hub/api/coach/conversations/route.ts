import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { conversations } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { dayKey } from "@/lib/hub/time";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ conversations: [], dbConnected: false });
  const rows = await db.select().from(conversations).orderBy(desc(conversations.updatedAt)).limit(30);
  return NextResponse.json({ conversations: rows, dbConnected: true });
}

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const [row] = await db.insert(conversations).values({ day: dayKey(), title: body.title?.slice(0, 60) || "New conversation" }).returning();
  return NextResponse.json({ ok: true, conversation: row });
}
