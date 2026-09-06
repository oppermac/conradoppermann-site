import { constantTimeEqual, hmacHex } from "./auth";

export const OAUTH_STATE_COOKIE = "hub_oauth_state";
const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

/** A random state plus a signed cookie value that the callback verifies. */
export async function createOAuthState(provider: string): Promise<{ state: string; cookieValue: string }> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expires = Date.now() + TTL_MS;
  const payload = `${provider}.${nonce}.${expires}`;
  const sig = await hmacHex(secret(), payload);
  return { state: nonce, cookieValue: `${payload}.${sig}` };
}

export async function verifyOAuthState(provider: string, state: string | null, cookieValue: string | undefined) {
  if (!state || !cookieValue) return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 4) return false;
  const [p, nonce, expires, sig] = parts;
  if (p !== provider || nonce !== state) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = await hmacHex(secret(), `${p}.${nonce}.${expires}`);
  return constantTimeEqual(expected, sig);
}

export const oauthStateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/hub",
  maxAge: TTL_MS / 1000,
};
