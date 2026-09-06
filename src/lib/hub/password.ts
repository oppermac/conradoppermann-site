import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time comparison of the submitted password against HUB_PASSWORD. */
export function passwordMatches(input: string): boolean {
  const expected = process.env.HUB_PASSWORD;
  if (!expected || !input) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
