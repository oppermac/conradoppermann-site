import { NextResponse, type NextRequest } from "next/server";
import {
  RENEW_BEFORE_MS,
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/hub/auth";

export const config = {
  matcher: ["/hub", "/hub/:path*"],
};

/** Routes that must work without a session. Everything else under /hub needs the cookie. */
const PUBLIC_EXACT = new Set<string>([
  "/hub/login",
  "/hub/api/auth/login",
  "/hub/api/whoop/webhook",
  "/hub/api/cron/tick",
  "/hub/api/oauth/whoop/callback",
  "/hub/api/oauth/google/callback",
  "/hub/api/oauth/token",
  "/hub/api/oauth/register",
  "/hub/manifest.webmanifest",
  "/hub/sw.js",
]);
const PUBLIC_PREFIX = ["/hub/icons/", "/hub/api/mcp"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session.ok) {
    if (pathname.startsWith("/hub/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/hub/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (session.expiresAt - Date.now() < RENEW_BEFORE_MS) {
    const { token, expiresAt } = await createSessionToken();
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  }
  return res;
}
