import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/lib/hub/db/client";
import { mealItems, meals } from "@/lib/hub/db/schema";
import { requireSession } from "@/lib/hub/session";
import { SaveMealSchema } from "@/lib/hub/meals/schema";

export async function PATCH(req: Request, ctx: RouteContext<"/hub/api/meals/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  const parsed = SaveMealSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid meal", issues: parsed.error.issues }, { status: 400 });
  const p = parsed.data;
  const [existing] = await db.select({ id: meals.id }).from(meals).where(eq(meals.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  await db
    .update(meals)
    .set({
      ...(p.name !== undefined ? { name: p.name } : {}),
      ...(p.slot !== undefined ? { slot: p.slot } : {}),
      ...(p.eatenAt !== undefined ? { eatenAt: new Date(p.eatenAt) } : {}),
      ...(p.kcal !== undefined ? { kcal: Math.round(p.kcal) } : {}),
      ...(p.proteinG !== undefined ? { proteinG: p.proteinG } : {}),
      ...(p.carbsG !== undefined ? { carbsG: p.carbsG } : {}),
      ...(p.fatG !== undefined ? { fatG: p.fatG } : {}),
      ...(p.notes !== undefined ? { notes: p.notes } : {}),
    })
    .where(eq(meals.id, id));
  if (p.items) {
    await db.delete(mealItems).where(eq(mealItems.mealId, id));
    if (p.items.length) {
      await db.insert(mealItems).values(
        p.items.map((it, i) => ({ mealId: id, name: it.name, portion: it.portion ?? null, grams: it.grams ?? null, kcal: Math.round(it.kcal), proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG, orderIndex: i })),
      );
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/hub/api/meals/[id]">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { id } = await ctx.params;
  await db.delete(meals).where(eq(meals.id, id));
  return NextResponse.json({ ok: true });
}
