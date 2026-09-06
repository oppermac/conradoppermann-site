"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

export type Segment = { href: string; label: string };

/** iOS segmented control for Day | Week | Month. The thumb moves with a critically damped spring. */
export function SegmentedControl({ segments, ariaLabel = "Scope" }: { segments: Segment[]; ariaLabel?: string }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  return (
    <nav aria-label={ariaLabel} className="hub-chrome inline-grid rounded-control p-0.5" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }} role="tablist">
      {segments.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            role="tab"
            aria-selected={active}
            className={`relative min-w-[72px] px-3 py-1.5 text-center text-[13px] font-semibold ${active ? "text-ink" : "text-ink-2"}`}
          >
            {active ? (
              <motion.span
                layoutId="hub-segment-thumb"
                className="absolute inset-0 rounded-[10px] bg-elevated shadow-sm"
                transition={reduce ? { duration: 0 } : { type: "spring", visualDuration: 0.35, bounce: 0 }}
                aria-hidden
              />
            ) : null}
            <span className="relative">{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export const SCOPE_SEGMENTS: Segment[] = [
  { href: "/hub", label: "Day" },
  { href: "/hub/week", label: "Week" },
  { href: "/hub/month", label: "Month" },
];
