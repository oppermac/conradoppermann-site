import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { EntrySchema, addEntry, copyDay, getPlan } from "@/lib/hub/meals/plan-store";

/** GET the whole week (days with entries and totals, set meals, shopping list). POST adds an entry or copies a day. */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  return NextResponse.json(await getPlan());
}

const Body = z.union([z.object({ action: z.literal("copyDay"), from: z.number().int().min(1).max(7), to: z.number().int().min(1).max(7) }), EntrySchema]);

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid entry", issues: parsed.error.issues }, { status: 400 });
  if ("action" in parsed.data) {
    await copyDay(parsed.data.from, parsed.data.to);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, ...(await addEntry(parsed.data)) });
}
