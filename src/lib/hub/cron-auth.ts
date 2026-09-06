import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "./session";

export type CronAuth = { ok: true; via: "cron" | "session" } | { ok: false; response: NextResponse };

/**
 * Cron routes accept `Authorization: Bearer <CRON_SECRET>` (what Vercel sends), or a signed-in session
 * with `?force=1` for manual runs from Settings. Fails closed when CRON_SECRET is unset.
 */
export async function authorizeCron(req: Request): Promise<CronAuth> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (secret && header.startsWith("Bearer ")) {
    const given = Buffer.from(header.slice(7));
    const want = Buffer.from(secret);
    if (given.length === want.length && timingSafeEqual(given, want)) return { ok: true, via: "cron" };
  }
  const url = new URL(req.url);
  if (url.searchParams.get("force") === "1") {
    const session = await getSession();
    if (session.ok) return { ok: true, via: "session" };
  }
  return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
}
