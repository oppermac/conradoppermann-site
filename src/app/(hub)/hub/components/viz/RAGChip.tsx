import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import type { Rag } from "@/lib/hub/domain/kpis";

const META: Record<Rag, { label: string; cls: string; Icon: typeof CircleCheck }> = {
  green: { label: "On track", cls: "text-good", Icon: CircleCheck },
  amber: { label: "At risk", cls: "text-warn", Icon: TriangleAlert },
  red: { label: "Behind", cls: "text-bad", Icon: CircleX },
};

/** Status is always icon + words, never colour alone. */
export function RAGChip({ rag, label, size = 14 }: { rag: Rag; label?: string; size?: number }) {
  const m = META[rag];
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${m.cls}`}>
      <m.Icon size={size} aria-hidden />
      {label ?? m.label}
    </span>
  );
}
