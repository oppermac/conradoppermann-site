import { after, NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/hub/db/client";
import { oauthTokens } from "@/lib/hub/db/schema";
import { hubBaseUrl } from "@/lib/hub/env";
import { OAUTH_STATE_COOKIE, oauthStateCookieOptions, verifyOAuthState } from "@/lib/hub/oauth-state";
import { saveTokens } from "@/lib/hub/tokens";
import { whoopApi } from "@/lib/hub/whoop/client";
import { exchangeWhoopCode } from "@/lib/hub/whoop/oauth";
import { backfillProgramme } from "@/lib/hub/whoop/sync";

function back(query: string) {
  const res = NextResponse.redirect(new URL(`/hub/settings?${query}`, hubBaseUrl()));
  res.cookies.set(OAUTH_STATE_COOKIE, "", { ...oauthStateCookieOptions, maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const error = q.get("error");
  if (error) return back(`error=whoop&reason=${encodeURIComponent(error)}`);
  const code = q.get("code");
  const ok = await verifyOAuthState("whoop", q.get("state"), req.cookies.get(OAUTH_STATE_COOKIE)?.value);
  if (!code || !ok) return back("error=whoop&reason=state");
  try {
    const tokens = await exchangeWhoopCode(code);
    await saveTokens("whoop", tokens, { raw: { scope: tokens.scope ?? null, connectedAt: new Date().toISOString() } });
    try {
      const profile = await whoopApi.profile();
      await db
        .update(oauthTokens)
        .set({ externalUserId: String(profile.user_id) })
        .where(eq(oauthTokens.provider, "whoop"));
    } catch {
      /* profile is a nicety */
    }
    after(async () => {
      try {
        await backfillProgramme();
      } catch (err) {
        console.error("[whoop] backfill failed", err);
      }
    });
    return back("connected=whoop");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return back(`error=whoop&reason=${encodeURIComponent(msg.slice(0, 120))}`);
  }
}
