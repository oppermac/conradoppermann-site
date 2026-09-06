import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db, hasDb } from "@/lib/hub/db/client";
import { people } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";

const PersonBody = z.object({
  name: z.string().trim().min(1).max(80),
  relationship: z.enum(["family", "longstanding", "friend", "team"]),
  cadenceDays: z.number().int().min(1).max(365),
  aliases: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const rows = await db.select().from(people).orderBy(asc(people.name));
  return NextResponse.json({ people: rows });
}

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = PersonBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const [row] = await db
    .insert(people)
    .values({
      name: parsed.data.name,
      relationship: parsed.data.relationship,
      cadenceDays: parsed.data.cadenceDays,
      aliases: parsed.data.aliases ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  return NextResponse.json({ person: row }, { status: 201 });
}
