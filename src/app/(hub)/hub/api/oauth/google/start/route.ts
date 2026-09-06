import { NextResponse } from "next/server";
import { requireSession } from "@/lib/hub/session";
import { OAUTH_STATE_COOKIE, createOAuthState, oauthStateCookieOptions } from "@/lib/hub/oauth-state";
import { googleAuthorizeUrl } from "@/lib/hub/google/oauth";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set" }, { status: 503 });
  }
  const { state, cookieValue } = await createOAuthState("google");
  const res = NextResponse.redirect(googleAuthorizeUrl(state));
  res.cookies.set(OAUTH_STATE_COOKIE, cookieValue, oauthStateCookieOptions);
  return res;
}
