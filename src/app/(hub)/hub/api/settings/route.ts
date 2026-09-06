import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { DEFAULT_SETTINGS, getSettings, resetSection, updateSettings, type SettingsSection } from "@/lib/hub/settings";

const SECTION_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingsSection[];

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  return NextResponse.json(await getSettings());
}

/** Body is a partial object keyed by settings section, e.g. `{ "sleep": { "bedtimeStart": "22:45" } }`. */
export async function PATCH(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Partial<Record<SettingsSection, unknown>> | null;
  try {
    const settings = await updateSettings(body ?? {});
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid settings", issues: err.issues }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const section = new URL(req.url).searchParams.get("section");
  if (!section || !SECTION_KEYS.includes(section as SettingsSection)) {
    return NextResponse.json({ error: "Unknown settings section" }, { status: 400 });
  }
  await resetSection(section as SettingsSection);
  const { settings } = await getSettings();
  return NextResponse.json({ settings });
}
