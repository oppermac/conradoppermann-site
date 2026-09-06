# Conrad Hub — operations guide

Private dashboard at **https://conradoppermann.com/hub**, inside this Next.js project (`src/app/(hub)`, `src/lib/hub`).
The landing page (`src/app/(site)`) is untouched.

## 1. One-time setup (Conrad, in the Vercel dashboard → project `conradoppermann` → Settings → Environment Variables)

| Step | What to create | Variables it yields |
|---|---|---|
| Database | Vercel → Storage → **Create Neon** (free), connect to the project | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (injected) |
| Photos | Vercel → Storage → **Create Blob**, access **public**, connect | `BLOB_READ_WRITE_TOKEN` (injected) |
| Secrets | `openssl rand -hex 32` twice; choose a hub password | `SESSION_SECRET`, `CRON_SECRET`, `HUB_PASSWORD` |
| Base URL | | `HUB_BASE_URL=https://conradoppermann.com` |
| Claude | console.anthropic.com → API key | `ANTHROPIC_API_KEY` |
| Whoop | developer.whoop.com → Team → App. Redirect URI `https://conradoppermann.com/hub/api/oauth/whoop/callback`; scopes read:profile, read:body_measurement, read:cycles, read:recovery, read:sleep, read:workout, offline; webhook URL `https://conradoppermann.com/hub/api/whoop/webhook` | `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET` |
| Google | Google Cloud (any project in maverick-social.com) → enable **Google Calendar API** → OAuth consent screen **Internal** → Credentials → OAuth client (Web). Redirect URIs `https://conradoppermann.com/hub/api/oauth/google/callback` and `http://localhost:3500/hub/api/oauth/google/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Monday | same token as the maverick-dashboard project | `MONDAY_API_TOKEN` |
| Slack | Slack app → Incoming Webhooks → your own DM | `SLACK_WEBHOOK_URL` (optional) |
| Push | `npx web-push generate-vapid-keys` | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:conrad@maverick-social.com`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (= public key) |

Then, from this folder: `vercel env pull .env.local`, `npm run db:migrate`, `npm run db:seed`, `vercel deploy --prod`.

## 2. First run (in the hub)

1. Sign in at `/hub/login`; add the hub to the iPhone Home Screen (Share → Add to Home Screen).
2. Settings → Integrations → **Connect Whoop** (backfills from 1 Sep 2026), **Connect Google** (syncs −14/+28 days), Monday shows "Sync now".
3. Settings → Calendars: read = primary + Conrad's Calendar + **Conrad's Private Time**; write = Conrad's Private Time (seeded). The hub only ever writes there.
4. Settings → People: add Mum, Dad and close friends with a cadence (days). Aliveness list: things you love doing.
5. Settings → Install & notifications → Enable notifications (only works from the installed app) → Send test.
6. Settings → Intelligence → "Write today's brief now" to see the first brief.

## 3. How it runs

- One Vercel cron hits `/hub/api/cron/tick` every 5 minutes (`vercel.json`). The tick computes Dublin local time and runs due jobs once each (ledger `job_runs`): calendar sync (15 min), Monday (30 min), Whoop backfill (2 h), deep reconcile (04:00), targets from Whoop (Mon 05:00), cups (15 min), brief (07:00 window), review (Sunday 18:00), nudges (09:00, 12:30, 14:00, 18:30 weekdays; 11:00, 18:00 weekends; 23:00 bedtime opt-in).
- Whoop also pushes webhooks (`/hub/api/whoop/webhook`, HMAC-verified) so workouts and sleeps appear within a minute.
- Manual runs: `GET /hub/api/cron/tick?job=brief&force=1` while signed in (Settings → Intelligence buttons do this).
- Nutrition targets: derived every Monday from the last 14 days of Whoop energy expenditure (maintain / lose / build in Settings); switch "Derived from Whoop" off to type your own.

## 4. Local development

`.env.local` (never committed) holds the pulled production values; the dev password is whatever `HUB_PASSWORD` is set to locally. Start with the `conradoppermann-site` preview (port 3500) or `npm run dev -- -p 3500`. Local dev shares the production Neon database. Useful: `npm run db:studio`, `npm test`, `npm run typecheck`, `/hub/dev/*` fixture pages (development only).

## 5. Where things live

`src/lib/hub/domain/*` — programme constants, activity/cup catalogue, KPI maths, gaps, slots, suggestions, facts, cups evaluator, nutrition targets. `src/lib/hub/whoop`, `google`, `monday`, `meals`, `notify`, `jobs`, `ai` (context, brief, review, nudges), `coach` (tools, executor, streaming loop). Pages under `src/app/(hub)/hub/(app)/*`, APIs under `src/app/(hub)/hub/api/*`, session gate in `src/proxy.ts`.
