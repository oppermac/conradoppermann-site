import { CircleCheck } from "lucide-react";
import type { MonthData } from "@/lib/hub/queries/month";

type ConnectedMonth = Extract<MonthData, { dbConnected: true }>;

/** Memorable experience, weeks fully green, and days that touched 3+ domains — the month's headline numbers. */
export function MonthlyTargetsCard({ memorable, weeksFullyGreen, weeksTotal, days }: { memorable: ConnectedMonth["memorable"]; weeksFullyGreen: number; weeksTotal: number; days: ConnectedMonth["days"] }) {
  const daysWithThree = days.filter((d) => !d.isFuture && d.domainsTouched >= 3).length;
  return (
    <section className="hub-card p-5">
      <h2 className="hub-eyebrow">Monthly targets</h2>
      <div className="mt-3 flex flex-col divide-y divide-hairline">
        <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
          <span className="text-[14px] font-medium text-ink-2">Memorable experience</span>
          {memorable.length > 0 ? (
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-good">
              <CircleCheck size={15} aria-hidden />
              <span className="truncate">
                {memorable[0].title}
                {memorable.length > 1 ? ` +${memorable.length - 1} more` : ""}
              </span>
            </span>
          ) : (
            <span className="text-[14px] text-ink-3">None flagged yet</span>
          )}
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-[14px] font-medium text-ink-2">Weeks fully green</span>
          <span className="hub-tabular text-[14px] font-semibold text-ink">
            {weeksFullyGreen} of {weeksTotal}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 last:pb-0">
          <span className="text-[14px] font-medium text-ink-2">Days with 3+ domains</span>
          <span className="hub-tabular text-[14px] font-semibold text-ink">{daysWithThree}</span>
        </div>
      </div>
    </section>
  );
}
