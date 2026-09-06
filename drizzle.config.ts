import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

// `generate` never connects; `migrate`/`studio` need the unpooled URL.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "postgres://placeholder/placeholder";

export default defineConfig({
  schema: "./src/lib/hub/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
