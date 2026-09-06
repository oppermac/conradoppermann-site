export type EnvSpec = { key: string; group: string; required: boolean; note?: string };

/** Every variable the hub reads, grouped for the Settings page. Values are never exposed. */
export const ENV_SPEC: EnvSpec[] = [
  { key: "SESSION_SECRET", group: "Core", required: true },
  { key: "HUB_PASSWORD", group: "Core", required: true },
  { key: "CRON_SECRET", group: "Core", required: true },
  { key: "HUB_BASE_URL", group: "Core", required: true },
  { key: "DATABASE_URL", group: "Data", required: true },
  { key: "DATABASE_URL_UNPOOLED", group: "Data", required: false },
  { key: "BLOB_READ_WRITE_TOKEN", group: "Data", required: true },
  { key: "ANTHROPIC_API_KEY", group: "Intelligence", required: true },
  { key: "WHOOP_CLIENT_ID", group: "Whoop", required: true },
  { key: "WHOOP_CLIENT_SECRET", group: "Whoop", required: true },
  { key: "GOOGLE_CLIENT_ID", group: "Google Calendar", required: true },
  { key: "GOOGLE_CLIENT_SECRET", group: "Google Calendar", required: true },
  { key: "MONDAY_API_TOKEN", group: "Monday", required: true },
  { key: "SLACK_WEBHOOK_URL", group: "Notifications", required: false },
  { key: "VAPID_PUBLIC_KEY", group: "Notifications", required: true },
  { key: "VAPID_PRIVATE_KEY", group: "Notifications", required: true },
  { key: "VAPID_SUBJECT", group: "Notifications", required: true },
  { key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", group: "Notifications", required: true },
];

export function envStatus(): Array<EnvSpec & { set: boolean }> {
  return ENV_SPEC.map((s) => ({ ...s, set: Boolean(process.env[s.key]) }));
}

export function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set`);
  return v;
}

export function hubBaseUrl(): string {
  return (process.env.HUB_BASE_URL ?? "http://localhost:3500").replace(/\/$/, "");
}
