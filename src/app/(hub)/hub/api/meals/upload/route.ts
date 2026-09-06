import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/hub/session";
import { dayKey } from "@/lib/hub/time";

export const maxDuration = 30;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Meal photos are downscaled on the phone (~1024 px, a few hundred KB), so they go through the server:
 * the Blob SDK authenticates with Vercel's OIDC token + BLOB_STORE_ID here (a read-write token also works).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const denied = await requireSession();
  if (denied) return denied;
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json({ error: "The photo store isn't connected yet" }, { status: 503 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only JPEG, PNG or WebP photos" }, { status: 400 });
  if (file.size > 6 * 1024 * 1024) return NextResponse.json({ error: "Photo is too large" }, { status: 413 });
  try {
    const blob = await put(`meals/${dayKey()}/${crypto.randomUUID()}.jpg`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
