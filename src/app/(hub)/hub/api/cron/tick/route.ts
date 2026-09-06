import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/hub/cron-auth";
import { tick } from "@/lib/hub/jobs/tick";

export const maxDuration = 300;

async function handle(req: Request) {
  const auth = await authorizeCron(req);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const result = await tick({ only: url.searchParams.get("job"), force: url.searchParams.get("force") === "1" });
  return NextResponse.json({ ok: result.failed.length === 0, via: auth.via, ...result });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
