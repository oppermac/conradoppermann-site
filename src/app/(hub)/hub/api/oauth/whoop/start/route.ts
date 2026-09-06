import { NextResponse } from "next/server";
import { requireSession } from "@/lib/hub/session";
import { OAUTH_STATE_COOKIE, createOAuthState, oauthStateCookieOptions } from "@/lib/hub/oauth-state";
import { whoopAuthorizeUrl } from "@/lib/hub/whoop/oauth";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  if (!process.env.WHOOP_CLIENT_ID || !process.env.WHOOP_CLIENT_SECRET) {
    return NextResponse.json({ error: "WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET are not set" }, { status: 503 });
  }
  const { state, cookieValue } = await createOAuthState("whoop");
  const res = NextResponse.redirect(whoopAuthorizeUrl(state));
  res.cookies.set(OAUTH_STATE_COOKIE, cookieValue, oauthStateCookieOptions);
  return res;
}
