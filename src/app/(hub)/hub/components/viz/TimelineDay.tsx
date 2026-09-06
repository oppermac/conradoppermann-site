"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Utensils } from "lucide-react";
import { dublin, weekdayOf, type DayKey } from "@/lib/hub/time";

export type TimelineDayItem = {
  id: string;
  kind: "event" | "workout" | "meal" | "sleep" | "activity";
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay?: boolean;
  domain?: string | null;
  eventKind?: string | null;
  meta?: string;
  thumb?: string | null;
};

const DOMAIN_COLOR: Record<string, string> = {
  work: "var(--hub-work)",
  body: "var(--hub-body)",
  relationships: "var(--hub-rel)",
  aliveness: "var(--hub-alive)",
};

const GUTTER = 46;
const MIN_HEIGHT = 24;

type Block = { item: TimelineDayItem; startMin: number; endMin: number };
type Positioned = Block & { col: number; cols: number };

/** Cluster overlapping blocks and assign each a lane, so concurrent items sit side by side rather than stack. */
function layoutColumns(blocks: Block[]): Positioned[] {
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const clusters: Block[][] = [];
  let current: Block[] = [];
  let clusterEnd = -Infinity;
  for (const b of sorted) {
    if (current.length && b.startMin >= clusterEnd) {
      clusters.push(current);
      current = [];
      clusterEnd = -Infinity;
    }
    current.push(b);
    clusterEnd = Math.max(clusterEnd, b.endMin);
  }
  if (current.length) clusters.push(current);

  const out: Positioned[] = [];
  for (const cluster of clusters) {
    const laneEnds: number[] = [];
    const withCol: Array<Block & { col: number }> = [];
    for (const b of cluster) {
      let lane = laneEnds.findIndex((end) => b.startMin >= end);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(b.endMin);
      } else {
        laneEnds[lane] = b.endMin;
      }
      withCol.push({ ...b, col: lane });
    }
    const cols = laneEnds.length;
    for (const b of withCol) out.push({ ...b, cols });
  }
  return out;
}

/** Minutes since `startHour` on `refDayKey`, clamped into [0, totalMin] so items spilling over midnight don't fly off-grid. */
function clampMinutes(iso: string, refDayKey: DayKey, startHour: number, totalMin: number): number {
  const dt = dublin(new Date(iso));
  const raw = dt.dayKey === refDayKey ? (dt.hour - startHour) * 60 + dt.minute : dt.dayKey < refDayKey ? 0 : totalMin;
  return Math.max(0, Math.min(totalMin, raw));
}

function hhmm(iso: string): string {
  return dublin(new Date(iso)).hhmm;
}

/**
 * A vertical day timeline, 06:00–24:00 by default. Events get a domain rail + light fill, workouts a
 * solid body-colour fill, meals a small thumbnail pinned to the time, sleep collapses to one line above
 * the grid, and a tint now-line marks the current time (only drawn when `dayKey` is today).
 */
export function TimelineDay({
  dayKey,
  items,
  now = new Date(),
  startHour = 6,
  endHour = 24,
  pxPerMin = 1,
}: {
  dayKey: DayKey;
  items: TimelineDayItem[];
  now?: Date;
  startHour?: number;
  endHour?: number;
  pxPerMin?: number;
}) {
  const reduce = useReducedMotion();
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const totalMin = (endHour - startHour) * 60;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, visualDuration: 0.35, bounce: 0 };

  useEffect(() => {
    if (scrolledRef.current || !nowLineRef.current) return;
    nowLineRef.current.scrollIntoView({ block: "center" });
    scrolledRef.current = true;
  }, []);

  const allDay = items.filter((i) => i.kind === "event" && i.allDay);
  const sleep = items.find((i) => i.kind === "sleep");
  const meals = items.filter((i) => i.kind === "meal");
  const blockItems = items.filter((i) => (i.kind === "event" && !i.allDay) || i.kind === "workout" || i.kind === "activity");

  const positioned = layoutColumns(
    blockItems.map((item) => {
      const startMin = clampMinutes(item.start, dayKey, startHour, totalMin);
      const endMin = Math.max(startMin + 15, clampMinutes(item.end, dayKey, startHour, totalMin));
      return { item, startMin, endMin };
    }),
  );

  const isWeekday = weekdayOf(dayKey) <= 5;
  const isToday = dublin(now).dayKey === dayKey;
  const nowMin = clampMinutes(now.toISOString(), dayKey, startHour, totalMin);
  const showNowLine = isToday && nowMin > 0 && nowMin < totalMin;

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const workStart = Math.max(9, startHour);
  const workEnd = Math.min(18, endHour);

  return (
    <div>
      {allDay.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {allDay.map((e) => (
            <span key={e.id} className="rounded-full bg-tint/12 px-2.5 py-1 text-[12px] font-semibold text-tint">
              {e.title}
            </span>
          ))}
        </div>
      ) : null}
      {sleep ? (
        <div className="mb-2 flex items-center gap-2 text-[13px] text-ink-2">
          <Moon size={14} className="shrink-0 text-ink-3" aria-hidden />
          <span>
            {sleep.title}
            {sleep.meta ? ` · ${sleep.meta}` : ""}
          </span>
        </div>
      ) : null}
      <div className="relative" style={{ height: totalMin * pxPerMin }}>
        {hours.map((h) => (
          <div key={h} className="absolute inset-x-0 border-t border-hairline" style={{ top: (h - startHour) * 60 * pxPerMin }}>
            <span className="hub-tabular absolute -top-2 left-0 bg-page pr-1.5 text-[11px] text-ink-3" style={{ width: GUTTER }}>
              {String(h % 24).padStart(2, "0")}:00
            </span>
          </div>
        ))}
        {isWeekday && workEnd > workStart ? (
          <div
            className="absolute bg-ink/[0.035]"
            style={{ left: GUTTER, right: 0, top: (workStart - startHour) * 60 * pxPerMin, height: (workEnd - workStart) * 60 * pxPerMin }}
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-y-0" style={{ left: GUTTER, right: 0 }}>
          {positioned.map((p, i) => {
            const color = (p.item.domain && DOMAIN_COLOR[p.item.domain]) || "var(--hub-ink-3)";
            const isWorkout = p.item.kind === "workout";
            const width = `calc(${100 / p.cols}% - ${p.cols > 1 ? 4 : 0}px)`;
            const left = `${(p.col / p.cols) * 100}%`;
            return (
              <motion.div
                key={p.item.id}
                className="absolute overflow-hidden rounded-[8px]"
                style={{
                  top: p.startMin * pxPerMin,
                  height: Math.max(MIN_HEIGHT, (p.endMin - p.startMin) * pxPerMin),
                  left,
                  width,
                  boxShadow: isWorkout ? undefined : `inset 3px 0 0 ${color}`,
                  backgroundColor: isWorkout ? "var(--hub-body)" : undefined,
                }}
                initial={reduce ? undefined : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: reduce ? 0 : i * 0.04 }}
              >
                {!isWorkout ? <div className="absolute inset-0" style={{ backgroundColor: color, opacity: 0.12 }} aria-hidden /> : null}
                <div className="relative px-2 py-1">
                  <div className={`truncate text-[12px] font-semibold leading-tight ${isWorkout ? "text-white" : "text-ink"}`}>{p.item.title}</div>
                  <div className={`hub-tabular truncate text-[11px] leading-tight ${isWorkout ? "text-white/80" : "text-ink-2"}`}>
                    {hhmm(p.item.start)}–{hhmm(p.item.end)}
                    {p.item.meta ? ` · ${p.item.meta}` : ""}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {meals.map((m) => {
            const top = clampMinutes(m.start, dayKey, startHour, totalMin) * pxPerMin;
            return (
              <div key={m.id} className="absolute right-1 flex -translate-y-1/2 items-center gap-1.5" style={{ top }} title={`${m.title}${m.meta ? ` · ${m.meta}` : ""}`}>
                <span className="hub-tabular hidden text-[11px] text-ink-3 sm:inline">{hhmm(m.start)}</span>
                {m.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.thumb} alt={m.title} className="h-7 w-7 rounded-full border border-hairline object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-elevated text-ink-2">
                    <Utensils size={14} aria-hidden />
                  </span>
                )}
              </div>
            );
          })}
          {showNowLine ? (
            <div ref={nowLineRef} className="absolute inset-x-0 z-10 flex items-center" style={{ top: nowMin * pxPerMin }}>
              <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-tint" aria-hidden />
              <span className="h-px flex-1 bg-tint" aria-hidden />
            </div>
          ) : (
            <div ref={nowLineRef} aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
}
