import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { SetMealSchema, createSetMeal, listSetMeals } from "@/lib/hub/meals/plan-store";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ setMeals: [] });
  return NextResponse.json({ setMeals: await listSetMeals() });
}

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = SetMealSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid set meal", issues: parsed.error.issues }, { status: 400 });
  return NextResponse.json({ ok: true, setMeal: await createSetMeal(parsed.data) });
}
