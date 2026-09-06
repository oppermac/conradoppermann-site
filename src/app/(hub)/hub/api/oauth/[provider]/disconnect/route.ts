import { NextResponse } from "next/server";
import { hasDb } from "@/lib/hub/db/client";
import { requireSession } from "@/lib/hub/session";
import { disconnect } from "@/lib/hub/tokens";

export async function POST(_req: Request, ctx: RouteContext<"/hub/api/oauth/[provider]/disconnect">) {
  const denied = await requireSession();
  if (denied) return denied;
  if (!hasDb) return NextResponse.json({ error: "Database not connected yet" }, { status: 503 });
  const { provider } = await ctx.params;
  if (provider !== "whoop" && provider !== "google") return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  await disconnect(provider);
  return NextResponse.json({ ok: true });
}
