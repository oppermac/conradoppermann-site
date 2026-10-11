"use client";

import Link from "next/link";
import type { TodayData } from "@/lib/hub/queries/today";
import { dublin } from "@/lib/hub/time";
import { BriefCard } from "../BriefCard";
import { GapsCard } from "../GapsCard";
import { CupsRow } from "../CupsRow";
import { TimelineDay } from "../viz/TimelineDay";
import { RingsRow } from "./RingsRow";
import { BodyStrip } from "./BodyStrip";
import { FoodStrip } from "./FoodStrip";
import { NudgesList } from "./NudgesList";

type ConnectedToday = Extract<TodayData, { dbConnected: true }>;

function NextUpRow({ nextUp }: { nextUp: ConnectedToday["nextUp"] }) {
  if (!nextUp) return null;
  const mins = Math.max(0, nextUp.inMinutes);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const inText = mins <= 0 ? "now" : h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
  return (
    <div className="hub-card flex min-h-11 items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="hub-eyebrow">What&apos;s next</div>
        <div className="mt-0.5 truncate text-[15px] font-semibold text-ink">{nextUp.title}</div>
      </div>
      <div className="hub-tabular shrink-0 text-[15px] font-semibold text-ink-2">{inText}</div>
    </div>
  );
}

/** The rest of today from an hour ago, eight hours tall at most; late in the evening it shows 16:00–24:00. */
function timelineWindow(now = new Date()): { startHour: number; endHour: number } {
  const h = dublin(now).hour; // Dublin on server and client alike, so hydration agrees
  const startHour = Math.max(6, Math.min(16, h - 1));
  return { startHour, endHour: Math.min(24, startHour + 8) };
}

/**
 * Today, assembled. Phone order is by glanceability: the numbers (body, food), the brief's one thing,
 * this week's gaps, what's next, rings, cups, then the timeline and nudges. Desktop keeps a 7/12 + 5/12 grid.
 */
export function TodayView({ data }: { data: ConnectedToday }) {
  const win = timelineWindow();
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start lg:gap-6">
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-2">
        <BodyStrip body={data.body} />
      </div>
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-3">
        <FoodStrip food={data.food} />
      </div>
      <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1">
        <BriefCard brief={data.brief} />
      </div>
      <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2">
        <GapsCard suggestions={data.suggestions} />
      </div>
      <div className="lg:col-span-7 lg:col-start-1 lg:row-start-3">
        <NextUpRow nextUp={data.nextUp} />
      </div>
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1">
        <RingsRow rings={data.rings} />
      </div>
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-4">
        <CupsRow cups={data.cups} />
      </div>
      <div className="lg:col-span-7 lg:col-start-1 lg:row-start-4">
        <div className="hub-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="hub-eyebrow">Today</h2>
            <Link href="/hub/body" className="hub-press text-[13px] font-semibold text-tint">
              Body
            </Link>
          </div>
          <div className="mt-3">
            <TimelineDay dayKey={data.dayKey} items={data.timeline} startHour={win.startHour} endHour={win.endHour} pxPerMin={0.8} />
          </div>
        </div>
      </div>
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-5">
        <NudgesList nudges={data.nudges} />
      </div>
    </div>
  );
}
