import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/hub/cron-auth";
import { dublinParts } from "@/lib/hub/time";

export const maxDuration = 300;

/** Phase 0 skeleton: authenticates and reports. The job registry arrives in Phase 6. */
async function tick(req: Request) {
  const auth = await authorizeCron(req);
  if (!auth.ok) return auth.response;
  const now = dublinParts();
  return NextResponse.json({
    ok: true,
    via: auth.via,
    local: `${now.year}-${now.month}-${now.day} ${now.hour}:${now.minute}`,
    ran: [],
    skipped: [],
    failed: [],
  });
}

export async function GET(req: Request) {
  return tick(req);
}

export async function POST(req: Request) {
  return tick(req);
}
