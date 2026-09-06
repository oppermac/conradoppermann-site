import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

/** True when Neon is configured. Pages degrade to defaults/empty states when it isn't. */
export const hasDb = Boolean(url);

// Lazy proxy so the app boots (and deploys) before Neon is provisioned.
export const db = url
  ? drizzle(neon(url), { schema })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(
            "DATABASE_URL is not set. Create the Neon database on the Vercel project (Storage → Neon) and run `vercel env pull .env.local`.",
          );
        },
      },
    ) as ReturnType<typeof drizzle<typeof schema>>);

export { schema };
