import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { getSettings } from "@/lib/hub/settings";
import { dayKey } from "@/lib/hub/time";
import { SaveMealSchema } from "@/lib/hub/meals/schema";
import { dailyTotals, mealsForDay, recentMeals, saveMeal } from "@/lib/hub/meals/store";

export async function GET(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ day: dayKey(), meals: [], totals: null, recent: [], dbConnected: false });
  const url = new URL(req.url);
  const day = url.searchParams.get("day") ?? dayKey();
  const [rows, totals, recent, { settings }] = await Promise.all([mealsForDay(day), dailyTotals(day), recentMeals(), getSettings()]);
  return NextResponse.json({ day, meals: rows, totals, recent, targets: settings.nutrition, dbConnected: true });
}

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const parsed = SaveMealSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meal", issues: (parsed.error as z.ZodError).issues }, { status: 400 });
  }
  const saved = await saveMeal(parsed.data);
  const totals = await dailyTotals(saved.day);
  return NextResponse.json({ ok: true, ...saved, totals });
}
