import { after, NextResponse, type NextRequest } from "next/server";
import { hubBaseUrl } from "@/lib/hub/env";
import { OAUTH_STATE_COOKIE, oauthStateCookieOptions, verifyOAuthState } from "@/lib/hub/oauth-state";
import { saveTokens } from "@/lib/hub/tokens";
import { exchangeGoogleCode } from "@/lib/hub/google/oauth";
import { syncCalendars } from "@/lib/hub/google/sync";

function back(query: string) {
  const res = NextResponse.redirect(new URL(`/hub/settings?${query}`, hubBaseUrl()));
  res.cookies.set(OAUTH_STATE_COOKIE, "", { ...oauthStateCookieOptions, maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const error = q.get("error");
  if (error) return back(`error=google&reason=${encodeURIComponent(error)}`);
  const code = q.get("code");
  const ok = await verifyOAuthState("google", q.get("state"), req.cookies.get(OAUTH_STATE_COOKIE)?.value);
  if (!code || !ok) return back("error=google&reason=state");
  try {
    const tokens = await exchangeGoogleCode(code);
    await saveTokens("google", tokens, { raw: { scope: tokens.scope ?? null, connectedAt: new Date().toISOString() } });
    after(async () => {
      try {
        await syncCalendars();
      } catch (err) {
        console.error("[google] initial sync failed", err);
      }
    });
    return back("connected=google");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return back(`error=google&reason=${encodeURIComponent(msg.slice(0, 120))}`);
  }
}
