import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/hub/session";

/**
 * Signed-URL issuer for direct-to-Blob meal photo uploads (session-gated by proxy.ts and here).
 * The client downscales to ~1024 px first, then POSTs the analyze route with the blob URL —
 * onUploadCompleted never fires on localhost, so the client drives the next step.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await requireSession();
  if (denied) return denied;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not set" }, { status: 503 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: 6 * 1024 * 1024,
        addRandomSuffix: true,
        validUntil: Date.now() + 5 * 60_000,
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("[meals] photo uploaded", blob.pathname);
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
