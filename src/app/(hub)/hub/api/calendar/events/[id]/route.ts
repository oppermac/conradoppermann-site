import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { applyUserClassification } from "@/lib/hub/google/classify";

const Body = z.object({
  calendarId: z.string().min(1),
  domain: z.enum(["work", "body", "relationships", "aliveness", "none"]),
  kind: z.string().min(1),
  applyToSimilar: z.boolean().optional().default(false),
});

/** Tap-to-correct an event's classification; optionally remember it as a rule for similar titles. */
export async function PATCH(req: Request, ctx: RouteContext<"/hub/api/calendar/events/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  try {
    await applyUserClassification({ id, ...parsed.data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Event not found" ? 404 : 400 });
  }
}
