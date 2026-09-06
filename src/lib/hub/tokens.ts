import { eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { oauthTokens, type OAuthProvider } from "./db/schema";

export class NotConnectedError extends Error {
  constructor(public provider: OAuthProvider) {
    super(`${provider} is not connected`);
  }
}
export class ReauthRequiredError extends Error {
  constructor(public provider: OAuthProvider) {
    super(`${provider} needs to be reconnected`);
  }
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

export type Refresher = (refreshToken: string) => Promise<TokenResponse>;

const memo = new Map<OAuthProvider, { token: string; until: number }>();
const EXPIRY_SKEW_MS = 60_000;
const MEMO_MS = 30_000;

export async function saveTokens(
  provider: OAuthProvider,
  t: TokenResponse,
  extra: { externalUserId?: string | null; raw?: unknown } = {},
): Promise<void> {
  const expiresAt = new Date(Date.now() + Math.max(60, t.expires_in) * 1000 - EXPIRY_SKEW_MS);
  await db
    .insert(oauthTokens)
    .values({
      provider,
      accessToken: t.access_token,
      refreshToken: t.refresh_token ?? null,
      expiresAt,
      scope: t.scope ?? null,
      externalUserId: extra.externalUserId ?? null,
      status: "ok",
      refreshLockUntil: null,
      raw: extra.raw ?? null,
    })
    .onConflictDoUpdate({
      target: oauthTokens.provider,
      set: {
        accessToken: t.access_token,
        // Some providers (Google) omit the refresh token on re-consent; keep the stored one.
        ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}),
        expiresAt,
        scope: t.scope ?? null,
        ...(extra.externalUserId !== undefined ? { externalUserId: extra.externalUserId } : {}),
        status: "ok",
        refreshLockUntil: null,
        updatedAt: new Date(),
        ...(extra.raw !== undefined ? { raw: extra.raw } : {}),
      },
    });
  memo.delete(provider);
}

export async function tokenStatus(provider: OAuthProvider) {
  const [row] = await db.select().from(oauthTokens).where(eq(oauthTokens.provider, provider)).limit(1);
  if (!row) return { connected: false as const };
  return {
    connected: true as const,
    status: row.status,
    expiresAt: row.expiresAt,
    externalUserId: row.externalUserId,
    updatedAt: row.updatedAt,
    scope: row.scope,
  };
}

export async function disconnect(provider: OAuthProvider): Promise<void> {
  await db.delete(oauthTokens).where(eq(oauthTokens.provider, provider));
  memo.delete(provider);
}

export async function markReauthRequired(provider: OAuthProvider): Promise<void> {
  await db
    .update(oauthTokens)
    .set({ status: "reauth_required", refreshLockUntil: null, updatedAt: new Date() })
    .where(eq(oauthTokens.provider, provider));
  memo.delete(provider);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns a valid access token, refreshing when needed. Refreshes are serialized with a single-statement
 * lock claim (Whoop rotates refresh tokens; a concurrent refresh would invalidate the winner's pair).
 */
export async function getAccessToken(provider: OAuthProvider, refresh: Refresher): Promise<string> {
  const cached = memo.get(provider);
  if (cached && cached.until > Date.now()) return cached.token;

  const [row] = await db.select().from(oauthTokens).where(eq(oauthTokens.provider, provider)).limit(1);
  if (!row) throw new NotConnectedError(provider);
  if (row.status === "reauth_required") throw new ReauthRequiredError(provider);

  const fresh = (expiresAt: Date) => expiresAt.getTime() > Date.now() + EXPIRY_SKEW_MS;
  if (fresh(row.expiresAt)) {
    memo.set(provider, { token: row.accessToken, until: Date.now() + MEMO_MS });
    return row.accessToken;
  }
  if (!row.refreshToken) {
    await markReauthRequired(provider);
    throw new ReauthRequiredError(provider);
  }

  // Claim the refresh lock in one statement (no transactions on neon-http).
  const claimed = await db.execute(sql`
    update oauth_tokens
       set refresh_lock_until = now() + interval '30 seconds'
     where provider = ${provider}
       and (refresh_lock_until is null or refresh_lock_until < now())
       and expires_at <= now() + interval '60 seconds'
     returning refresh_token
  `);
  const claimedRow = (claimed.rows as Array<{ refresh_token: string | null }>)[0];

  if (claimedRow?.refresh_token) {
    try {
      const t = await refresh(claimedRow.refresh_token);
      await saveTokens(provider, t);
      memo.set(provider, { token: t.access_token, until: Date.now() + MEMO_MS });
      return t.access_token;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/invalid_grant|invalid_token|unauthorized_client/i.test(msg)) {
        await markReauthRequired(provider);
        throw new ReauthRequiredError(provider);
      }
      await db
        .update(oauthTokens)
        .set({ refreshLockUntil: null })
        .where(eq(oauthTokens.provider, provider));
      throw err;
    }
  }

  // Someone else holds the lock: wait for their refresh to land.
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    await sleep(500);
    const [again] = await db.select().from(oauthTokens).where(eq(oauthTokens.provider, provider)).limit(1);
    if (!again) throw new NotConnectedError(provider);
    if (again.status === "reauth_required") throw new ReauthRequiredError(provider);
    if (fresh(again.expiresAt)) {
      memo.set(provider, { token: again.accessToken, until: Date.now() + MEMO_MS });
      return again.accessToken;
    }
  }
  throw new Error(`Timed out waiting for a ${provider} token refresh`);
}
