/**
 * Single-user session tokens. Web Crypto only, so the same code runs in proxy.ts and route handlers.
 * Token format: v1.<expiryMs>.<hex hmac-sha256(SESSION_SECRET, "v1.<expiryMs>")>
 * Bumping the version (or rotating SESSION_SECRET) signs every device out.
 */
export const SESSION_COOKIE = "hub_session";
export const SESSION_DAYS = 90;
export const RENEW_BEFORE_MS = 30 * 24 * 60 * 60 * 1000;
const VERSION = "v1";
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type SessionCheck =
  | { ok: true; expiresAt: number }
  | { ok: false; reason: "missing" | "malformed" | "expired" | "bad-signature" | "no-secret" };

export async function createSessionToken(now = Date.now()): Promise<{ token: string; expiresAt: number }> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const expiresAt = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${VERSION}.${expiresAt}`;
  return { token: `${payload}.${await hmacHex(secret, payload)}`, expiresAt };
}

export async function verifySessionToken(token: string | undefined | null, now = Date.now()): Promise<SessionCheck> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return { ok: false, reason: "no-secret" };
  if (!token) return { ok: false, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return { ok: false, reason: "malformed" };
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt)) return { ok: false, reason: "malformed" };
  const expected = await hmacHex(secret, `${parts[0]}.${parts[1]}`);
  if (!constantTimeEqual(expected, parts[2])) return { ok: false, reason: "bad-signature" };
  if (expiresAt <= now) return { ok: false, reason: "expired" };
  return { ok: true, expiresAt };
}

const baseCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/hub",
};

export function sessionCookieOptions(expiresAt: number) {
  return { ...baseCookie, expires: new Date(expiresAt) };
}

export function clearedSessionCookieOptions() {
  return { ...baseCookie, maxAge: 0 };
}
