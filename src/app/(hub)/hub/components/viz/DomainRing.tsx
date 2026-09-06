"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Domain } from "@/lib/hub/domain/programme";

const COLOR: Record<Domain, string> = { work: "var(--hub-work)", body: "var(--hub-body)", relationships: "var(--hub-rel)", aliveness: "var(--hub-alive)" };

/**
 * Activity-style ring. Starts at 12 o'clock, round caps, animates from its current value with a critically
 * damped spring; past 100 % a second, softer lap is drawn.
 */
export function DomainRing({
  domain,
  progress,
  size = 96,
  stroke = 10,
  label,
  center,
  ariaLabel,
}: {
  domain: Domain;
  progress: number; // 0..∞
  size?: number;
  stroke?: number;
  label?: string;
  center?: React.ReactNode;
  ariaLabel?: string;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, progress);
  const lap1 = Math.min(1, p);
  const lap2 = Math.max(0, Math.min(1, p - 1));
  const color = COLOR[domain];
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, visualDuration: 0.9, bounce: 0 };
  return (
    <div className="inline-flex flex-col items-center gap-1.5" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel ?? `${label ?? domain}: ${Math.round(p * 100)}%`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: c * (1 - lap1) }}
            transition={spring}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          {lap2 > 0 ? (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeOpacity={0.55}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              initial={false}
              animate={{ strokeDashoffset: c * (1 - lap2) }}
              transition={spring}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.25))" }}
            />
          ) : null}
        </svg>
        {center ? <div className="absolute inset-0 flex items-center justify-center">{center}</div> : null}
      </div>
      {label ? <div className="text-[13px] font-semibold text-ink-2">{label}</div> : null}
    </div>
  );
}
