import { getSettings } from "../settings";
import { hasPush, sendPush } from "./push";
import { hasSlack, sendSlack } from "./slack";

export type Notification = { title: string; body: string; url?: string; tag?: string };

/** Fan out to every enabled channel. Never throws; returns what happened. */
export async function notify(n: Notification): Promise<{ push: number; slack: boolean }> {
  const { settings } = await getSettings();
  const out = { push: 0, slack: false };
  if (settings.notifications.push && hasPush()) {
    try {
      out.push = (await sendPush(n)).sent;
    } catch (err) {
      console.error("[notify] push failed", err);
    }
  }
  if (settings.notifications.slack && hasSlack()) {
    try {
      out.slack = await sendSlack(n);
    } catch (err) {
      console.error("[notify] slack failed", err);
    }
  }
  return out;
}
