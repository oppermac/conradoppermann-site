import Link from "next/link";
import { CUPS, type Cup } from "@/lib/hub/domain/activity-types";
import { NeuroCup } from "./viz/NeuroCup";

export type CupRowItem = { cup: Cup; drops: number; capacity: number; low: boolean };

/** Compact single-row strip of all six cups (Today). Tapping anywhere jumps to the cups section of Week. */
export function CupsRow({ cups, size = 32 }: { cups: CupRowItem[]; size?: number }) {
  const ordered = CUPS.map((c) => cups.find((x) => x.cup === c)).filter((c): c is CupRowItem => Boolean(c));
  return (
    <Link href="/hub/week#cups" className="hub-press hub-card block p-5">
      <h2 className="hub-eyebrow">Cups</h2>
      <div className="mt-3 flex items-start gap-1 overflow-x-auto">
        {ordered.map((c) => (
          <NeuroCup key={c.cup} cup={c.cup} drops={c.drops} capacity={c.capacity} size={size} attention={c.low} />
        ))}
      </div>
    </Link>
  );
}
