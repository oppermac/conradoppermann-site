"use client";

import { useRef, useState } from "react";
import { Camera, Images, X } from "lucide-react";
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

const MAX_PHOTOS = 6;

type Shot = { id: string; file: File; preview: string };
type Phase = "idle" | "uploading" | "analysing";

/**
 * One meal, up to six photos (several angles, or every plate of a meal) and an optional note, in one
 * estimate. Photos are downscaled on the phone, uploaded together, then analysed as a set.
 */
export function MealCamera({ onEstimate, onError }: { onEstimate: (estimate: MealEstimate, photoUrls: string[], model: string) => void; onError: (message: string) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - shots.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    const sized = await Promise.all(picked.map(webSizedImage));
    setShots((s) => [...s, ...sized.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))]);
  }

  function remove(id: string) {
    setShots((s) => {
      const gone = s.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return s.filter((x) => x.id !== id);
    });
  }

  async function estimate() {
    if (!shots.length) return;
    try {
      setPhase("uploading");
      const photoUrls = await Promise.all(
        shots.map(async (shot) => {
          const form = new FormData();
          form.append("file", shot.file, "meal.jpg");
          const up = await fetch("/hub/api/meals/upload", { method: "POST", body: form });
          const data = (await up.json().catch(() => ({}))) as { url?: string; error?: string };
          if (!up.ok || !data.url) throw new Error(data.error ?? "Couldn’t upload a photo.");
          return data.url;
        }),
      );
      setPhase("analysing");
      const res = await fetch("/hub/api/meals/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ photoUrls, hint: note.trim() || undefined }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; estimate?: MealEstimate; model?: string };
      if (!res.ok || !data.estimate) throw new Error(data.error ?? "Couldn’t read this one. Try again, or log it as text.");
      onEstimate(data.estimate, photoUrls, data.model ?? "");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn’t read this one. Try again, or log it as text.");
    } finally {
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";
  const full = shots.length >= MAX_PHOTOS;

  return (
    <div className="flex flex-col gap-3">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />

      {shots.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {shots.map((shot) => (
            <div key={shot.id} className="relative overflow-hidden rounded-[12px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.preview} alt="" className="aspect-square w-full object-cover" />
              {!busy ? (
                <button type="button" onClick={() => remove(shot.id)} aria-label="Remove photo" className="hub-press absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
                  <X size={14} aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
          {!full && !busy ? (
            <button type="button" onClick={() => libraryRef.current?.click()} aria-label="Add photos" className="hub-press flex aspect-square items-center justify-center rounded-[12px] border border-dashed border-hairline text-ink-3">
              <Images size={22} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy || full} onClick={() => cameraRef.current?.click()} className="hub-press flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
          <Camera size={18} aria-hidden /> {shots.length ? "Another" : "Camera"}
        </button>
        <button type="button" disabled={busy || full} onClick={() => libraryRef.current?.click()} className="hub-press flex h-12 items-center justify-center gap-2 rounded-full border border-hairline text-[15px] font-semibold disabled:opacity-50">
          <Images size={18} aria-hidden /> Photos
        </button>
      </div>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional: what it is, or what the photo doesn’t show" className="rounded-control border border-hairline bg-card px-3 py-2 text-[15px]" disabled={busy} />

      {shots.length > 0 ? (
        <button type="button" disabled={busy} onClick={estimate} className="hub-press h-12 rounded-full bg-tint text-[15px] font-semibold text-white disabled:opacity-60">
          {phase === "uploading" ? "Uploading…" : phase === "analysing" ? "Analysing…" : `Estimate ${shots.length > 1 ? `${shots.length} photos` : "meal"}`}
        </button>
      ) : null}
    </div>
  );
}
