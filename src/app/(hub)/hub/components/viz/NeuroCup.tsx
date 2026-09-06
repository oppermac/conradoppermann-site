"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { CUP_META, type Cup } from "@/lib/hub/domain/activity-types";

/**
 * A glass that fills with liquid. Level animates with a soft spring (bounce 0.15); the label and the
 * "n/10" are always visible text, and attention is an icon + "Low", never colour alone.
 */
export function NeuroCup({
  cup,
  drops,
  capacity,
  size = 48,
  attention = false,
  showLabel = true,
}: {
  cup: Cup;
  drops: number;
  capacity: number;
  size?: number;
  attention?: boolean;
  showLabel?: boolean;
}) {
  const reduce = useReducedMotion();
  const meta = CUP_META[cup];
  const color = `var(${meta.colorVar})`;
  const fill = capacity > 0 ? Math.min(1, drops / capacity) : 0;
  const w = size;
  const h = Math.round(size * 1.2);
  const top = 4;
  const bottom = h - 4;
  const inner = bottom - top;
  const level = bottom - inner * fill;
  const clipId = `cup-${cup}-${size}`;
  const glass = `M ${w * 0.16} ${top} L ${w * 0.84} ${top} L ${w * 0.76} ${bottom - 6} Q ${w * 0.75} ${bottom} ${w * 0.68} ${bottom} L ${w * 0.32} ${bottom} Q ${w * 0.25} ${bottom} ${w * 0.24} ${bottom - 6} Z`;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, visualDuration: 0.8, bounce: 0.15 };
  return (
    <div className="inline-flex flex-col items-center gap-1" style={{ width: Math.max(w, 56) }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${meta.label}: ${drops} of ${capacity} drops this week${attention ? ", low" : ""}`}>
        <defs>
          <clipPath id={clipId}>
            <path d={glass} />
          </clipPath>
        </defs>
        <path d={glass} fill={color} fillOpacity={0.08} stroke="var(--hub-ink-3)" strokeOpacity={0.6} strokeWidth={1} />
        <motion.g clipPath={`url(#${clipId})`} initial={false} animate={{ y: 0 }}>
          <motion.rect x={0} width={w} height={h} fill={color} fillOpacity={0.85} initial={false} animate={{ y: level }} transition={spring} />
          <motion.rect x={0} width={w} height={1.5} fill="#fff" fillOpacity={0.5} initial={false} animate={{ y: level }} transition={spring} />
          {fill >= 1 ? <rect x={0} y={top} width={w} height={inner} fill="#fff" fillOpacity={0.12} /> : null}
        </motion.g>
      </svg>
      {showLabel ? (
        <>
          <div className="text-[12px] font-semibold leading-none text-ink-2">{meta.short}</div>
          <div className="hub-tabular text-[12px] leading-none text-ink-3">
            {drops}/{capacity}
          </div>
          {attention ? (
            <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-warn-fill/15 px-1.5 py-0.5 text-[10px] font-semibold text-warn">
              <TriangleAlert size={10} aria-hidden /> Low
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
