import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { applyKindOverride } from "@/lib/hub/whoop/sync";

const Body = z.object({
  kind: z.enum(["cardio", "strength", "mixed", "mobility", "movement", "leisure", "recovery", "other"]),
});

export async function PATCH(req: Request, ctx: RouteContext<"/hub/api/whoop/workouts/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "kind is required" }, { status: 400 });
  try {
    await applyKindOverride(id, parsed.data.kind);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Workout not found" ? 404 : 500 });
  }
}
