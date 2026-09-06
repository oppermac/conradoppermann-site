"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Camera } from "lucide-react";
import type { MealEstimate } from "@/lib/hub/meals/schema";

/** Phones hand us 12 MP originals; ~1024 px on the long edge is plenty for the estimate. */
export async function webSizedImage(file: File): Promise<File> {
  const MAX = 1024;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], "meal.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

type Phase = "idle" | "preparing" | "uploading" | "analysing";
const LABEL: Record<Phase, string> = { idle: "", preparing: "Preparing…", uploading: "Uploading…", analysing: "Analysing…" };

export function MealCamera({ onEstimate, onError }: { onEstimate: (estimate: MealEstimate, photoUrl: string, model: string) => void; onError: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    try {
      setPhase("preparing");
      const sized = await webSizedImage(file);
      setPreview(URL.createObjectURL(sized));
      setPhase("uploading");
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(new Date());
      const blob = await upload(`meals/${day}/${crypto.randomUUID()}.jpg`, sized, { access: "public", handleUploadUrl: "/hub/api/meals/upload", contentType: "image/jpeg" });
      setPhase("analysing");
      const res = await fetch("/hub/api/meals/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ photoUrl: blob.url }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; estimate?: MealEstimate; model?: string };
      if (!res.ok || !data.estimate) throw new Error(data.error ?? "Couldn’t read this one. Try again, or log it as text.");
      onEstimate(data.estimate, blob.url, data.model ?? "");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn’t read this one. Try again, or log it as text.");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {preview ? (
        <div className="relative overflow-hidden rounded-tile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your meal" className="aspect-[4/3] w-full object-cover" />
          {phase !== "idle" ? (
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3">
              <span className="rounded-full bg-white/90 px-3 py-1 text-[13px] font-semibold text-black">{LABEL[phase]}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      <button type="button" disabled={phase !== "idle"} onClick={() => inputRef.current?.click()} className="hub-press flex h-14 items-center justify-center gap-2 rounded-full bg-ink text-[17px] font-semibold text-page disabled:opacity-50">
        <Camera size={20} aria-hidden />
        {preview ? "Take another" : "Take a photo"}
      </button>
      <p className="text-center text-[13px] text-ink-3">Claude estimates calories and macros; you confirm.</p>
    </div>
  );
}
