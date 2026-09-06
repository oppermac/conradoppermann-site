"use client";

import Link from "next/link";
import { Camera, Type } from "lucide-react";
import type { FoodData } from "@/lib/hub/queries/food";
import { useLogSheet } from "../sheet/LogSheetProvider";
import { KcalBar, MacroBars } from "./MacroBars";
import { MealList } from "./MealList";
import { RecentMeals } from "./RecentMeals";

type Connected = Extract<FoodData, { dbConnected: true }>;

export function FoodView({ data }: { data: Connected }) {
  const { open } = useLogSheet();
  const noTargets = !data.targets.kcal;
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
      <div className="flex flex-col gap-5 lg:col-span-7">
        <section className="hub-card p-5">
          <KcalBar totals={data.totals} targets={data.targets} />
          <div className="mt-4">
            <MacroBars totals={data.totals} targets={data.targets} />
          </div>
          {noTargets ? (
            <p className="mt-3 text-[13px] text-ink-2">
              Targets appear after the first Whoop week —{" "}
              <Link href="/hub/settings" className="font-semibold text-tint">
                set them in Settings
              </Link>{" "}
              to start now.
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => open("photo")} className="hub-press flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-page">
              <Camera size={18} aria-hidden /> Photo
            </button>
            <button type="button" onClick={() => open("text")} className="hub-press flex h-12 items-center justify-center gap-2 rounded-full border border-hairline text-[15px] font-semibold">
              <Type size={18} aria-hidden /> Text
            </button>
          </div>
        </section>
        <section className="hub-card p-5">
          <h2 className="hub-eyebrow">{data.isToday ? "Today" : data.label}</h2>
          <div className="mt-2">
            <MealList meals={data.meals} />
          </div>
        </section>
      </div>
      <div className="flex flex-col gap-5 lg:col-span-5">
        <section className="hub-card p-5">
          <h2 className="hub-eyebrow">Recent</h2>
          <div className="mt-3">
            <RecentMeals recent={data.recent} compact />
          </div>
        </section>
        <section className="hub-card p-5">
          <h2 className="hub-eyebrow">This week</h2>
          <div className="mt-3 flex justify-between">
            {data.week.map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <span className={`h-3 w-3 rounded-full ${d.consistent ? "bg-good" : d.meals > 0 ? "bg-ink/25" : "border border-hairline"} ${d.isToday ? "ring-2 ring-tint ring-offset-2 ring-offset-page" : ""}`} aria-label={`${d.label}: ${d.consistent ? "consistent" : d.meals > 0 ? `${d.meals} meals` : "nothing logged"}`} />
                <span className="text-[11px] text-ink-3">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-ink-2">
            {data.averages ? `Average ${data.averages.kcal.toLocaleString("en-GB")} kcal and ${data.averages.proteinG} g protein over ${data.averages.days} logged day${data.averages.days === 1 ? "" : "s"}.` : "Nothing logged this week yet."}
          </p>
        </section>
      </div>
    </div>
  );
}
