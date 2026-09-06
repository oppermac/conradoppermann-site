import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic } from "@/lib/hub/ai/anthropic";
import { requireSession } from "@/lib/hub/session";
import { getSettings } from "@/lib/hub/settings";
import { dublin } from "@/lib/hub/time";
import { analyzeMealPhoto } from "@/lib/hub/meals/vision";
import { slotForHour } from "@/lib/hub/meals/schema";

export const maxDuration = 60;

const Body = z.object({ photoUrl: z.string().url(), hint: z.string().max(300).optional() });

export async function POST(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasAnthropic()) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "photoUrl is required" }, { status: 400 });
  const { settings } = await getSettings().catch(() => ({ settings: null }));
  const now = dublin();
  try {
    const result = await analyzeMealPhoto(parsed.data.photoUrl, {
      hint: parsed.data.hint,
      timeHint: `${now.hhmm} on a ${["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][now.weekday]}`,
      targets: settings ? { kcal: settings.nutrition.kcal, proteinG: settings.nutrition.proteinG } : null,
    });
    const estimate = { ...result.estimate, slot: result.estimate.slot ?? slotForHour(now.hour + now.minute / 60) };
    return NextResponse.json({ ok: true, estimate, model: result.model, raw: result.raw });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
