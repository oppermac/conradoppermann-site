import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic } from "@/lib/hub/ai/anthropic";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { getSettings } from "@/lib/hub/settings";
import { dublin } from "@/lib/hub/time";
import { parseMealText } from "@/lib/hub/meals/vision";
import { slotForHour } from "@/lib/hub/meals/schema";
import { dailyTotals, saveMeal } from "@/lib/hub/meals/store";

export const maxDuration = 60;

const Body = z.object({ text: z.string().min(2).max(500), autoConfirm: z.boolean().optional().default(false), source: z.enum(["text", "coach", "mcp"]).optional().default("text") });

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasAnthropic()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "text is required" }, { status: 400 });
  const { settings } = await getSettings().catch(() => ({ settings: null }));
  const now = dublin();
  try {
    const result = await parseMealText(parsed.data.text, {
      timeHint: now.hhmm,
      targets: settings ? { kcal: settings.nutrition.kcal, proteinG: settings.nutrition.proteinG } : null,
    });
    const estimate = { ...result.estimate, slot: result.estimate.slot ?? slotForHour(now.hour + now.minute / 60) };
    if (!parsed.data.autoConfirm) return NextResponse.json({ ok: true, estimate, model: result.model });
    if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
    const saved = await saveMeal({
      name: estimate.name,
      slot: estimate.slot,
      source: parsed.data.source,
      items: estimate.items.map((it) => ({ name: it.name, portion: it.portion, grams: it.grams, kcal: it.kcal, proteinG: it.protein_g, carbsG: it.carbs_g, fatG: it.fat_g })),
      kcal: estimate.totals.kcal,
      proteinG: estimate.totals.protein_g,
      carbsG: estimate.totals.carbs_g,
      fatG: estimate.totals.fat_g,
      fibreG: estimate.totals.fibre_g,
      confidence: estimate.confidence,
      aiModel: result.model,
      aiRaw: result.raw,
    });
    return NextResponse.json({ ok: true, estimate, saved, totals: await dailyTotals(saved.day) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
