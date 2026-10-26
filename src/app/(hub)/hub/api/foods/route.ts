import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { FoodInputSchema, createFood, searchFoods } from "@/lib/hub/meals/foods";

/** GET ?q= searches the food library (most used first). POST adds a food. */
export async function GET(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ foods: [], dbConnected: false });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ foods: await searchFoods(q), dbConnected: true });
}

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = FoodInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid food", issues: parsed.error.issues }, { status: 400 });
  return NextResponse.json({ ok: true, food: await createFood(parsed.data) });
}
