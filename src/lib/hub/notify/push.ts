import webpush from "web-push";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { pushSubscriptions } from "../db/schema";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:conrad@maverick-social.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export const hasPush = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export async function sendPush(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!configure()) return { sent: 0, failed: 0 };
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.disabled, false));
  let sent = 0;
  let failed = 0;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ ...payload, url: payload.url ?? "/hub" }),
          { TTL: 3600 },
        );
        sent += 1;
        await db.update(pushSubscriptions).set({ lastSuccessAt: new Date(), failCount: 0 }).where(eq(pushSubscriptions.id, s.id));
      } catch (err) {
        failed += 1;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        } else {
          await db
            .update(pushSubscriptions)
            .set({ failCount: sql`${pushSubscriptions.failCount} + 1`, disabled: sql`${pushSubscriptions.failCount} + 1 >= 5` })
            .where(eq(pushSubscriptions.id, s.id));
        }
      }
    }),
  );
  return { sent, failed };
}
