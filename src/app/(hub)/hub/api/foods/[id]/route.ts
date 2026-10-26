import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { FoodInputSchema, deleteFood, updateFood } from "@/lib/hub/meals/foods";

export async function PATCH(req: Request, ctx: RouteContext<"/hub/api/foods/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  const parsed = FoodInputSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid patch", issues: parsed.error.issues }, { status: 400 });
  const food = await updateFood(id, parsed.data);
  if (!food) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, food });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/hub/api/foods/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  await deleteFood(id);
  return NextResponse.json({ ok: true });
}
