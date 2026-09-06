import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  clearedSessionCookieOptions,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/hub/auth";
import { passwordMatches } from "@/lib/hub/password";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function ipOf(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

function isThrottled(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  const ip = ipOf(req);
  if (isThrottled(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  if (!process.env.SESSION_SECRET || !process.env.HUB_PASSWORD) {
    return NextResponse.json(
      { error: "The hub isn't configured yet — SESSION_SECRET and HUB_PASSWORD are missing." },
      { status: 503 },
    );
  }
  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    password = "";
  }
  if (!passwordMatches(password)) {
    const entry = attempts.get(ip);
    if (entry) entry.count += 1;
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  attempts.delete(ip);
  const { token, expiresAt } = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", clearedSessionCookieOptions());
  return res;
}
