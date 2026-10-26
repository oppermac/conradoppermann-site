import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const r = await sql`select now() as now, (select count(*) from information_schema.tables where table_name='foods') as foods_table`;
  console.log(r[0]);
}
main().catch((e) => { console.error("ERR", e.message?.slice(0, 300)); process.exit(1); });
