import { hubBaseUrl } from "../env";

export const hasSlack = () => Boolean(process.env.SLACK_WEBHOOK_URL);

/** Posts to Conrad's Slack DM via an incoming webhook, with a deep link back to the hub. */
export async function sendSlack(p: { title: string; body: string; url?: string }): Promise<boolean> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return false;
  const link = `${hubBaseUrl()}${p.url ?? "/hub"}`;
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `${p.title} — ${p.body}`,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*${p.title}*\n${p.body}` } },
        { type: "context", elements: [{ type: "mrkdwn", text: `<${link}|Open in Hub>` }] },
      ],
    }),
  });
  return res.ok;
}
