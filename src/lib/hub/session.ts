import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type SessionCheck } from "./auth";

export async function getSession(): Promise<SessionCheck> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Route-handler guard (defence in depth behind proxy.ts). Returns a 401 response or null when signed in. */
export async function requireSession(): Promise<NextResponse | null> {
  const session = await getSession();
  return session.ok ? null : NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
