import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { dailyTotals, repeatMeal } from "@/lib/hub/meals/store";

export async function POST(_req: Request, ctx: RouteContext<"/hub/api/meals/[id]/repeat">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  try {
    const saved = await repeatMeal(id);
    return NextResponse.json({ ok: true, ...saved, totals: await dailyTotals(saved.day) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: msg === "Meal not found" ? 404 : 500 });
  }
}
