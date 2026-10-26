import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { SetMealSchema, deleteSetMeal, updateSetMeal } from "@/lib/hub/meals/plan-store";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  const parsed = SetMealSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch", issues: parsed.error.issues }, { status: 400 });
  const setMeal = await updateSetMeal(id, parsed.data);
  if (!setMeal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, setMeal });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  await deleteSetMeal(id);
  return NextResponse.json({ ok: true });
}
