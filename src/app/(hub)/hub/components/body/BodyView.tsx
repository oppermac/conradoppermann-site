"use client";

import Link from "next/link";
import type { BodyData } from "@/lib/hub/queries/body";
import { StatTile } from "../viz/StatTile";
import { TrendSparkline } from "../viz/TrendSparkline";
import { RAGChip } from "../viz/RAGChip";
import { SleepBar } from "./SleepBar";
import { WorkoutList } from "./WorkoutList";
import { MedicationList } from "./MedicationList";

type Connected = Extract<BodyData, { dbConnected: true }>;

const STATUS_LABEL = { early: "early", in: "in window", late: "late" } as const;

function Trend({ label, points, unit, band }: { label: string; points: Array<number | null>; unit?: string; band?: { min: number; max: number } }) {
  const latest = [...points].reverse().find((p) => p !== null && Number.isFinite(p));
  return (
    <div className="hub-elevated flex items-center justify-between gap-3 p-3.5">
      <div>
        <div className="text-[13px] font-semibold text-ink-2">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="hub-tabular text-[22px] font-semibold leading-none">{latest !== undefined && latest !== null ? Math.round(latest) : "—"}</span>
          {unit ? <span className="text-[12px] text-ink-3">{unit}</span> : null}
        </div>
      </div>
      <TrendSparkline points={points} width={110} height={34} color="var(--hub-ink-3)" accent="var(--hub-body)" band={band} ariaLabel={`${label} over 28 days`} />
    </div>
  );
}

export function BodyView({ data }: { data: Connected }) {
  const s = data.sessions;
  const sessionRag = s ? (s.done >= s.target ? "green" : s.done >= 3 ? "amber" : "red") : "amber";
  return (
    <div className="flex flex-col gap-5">
      {!data.connected ? (
        <section className="hub-card p-5">
          <p className="text-[15px] text-ink-2">
            {data.needsReauth ? "Whoop needs a fresh sign-in." : "Connect Whoop in Settings to see recovery, sleep and training here."}{" "}
            <Link href="/hub/settings" className="font-semibold text-tint">
              Open Settings
            </Link>
          </p>
        </section>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Recovery" value={data.recovery?.score !== null && data.recovery?.score !== undefined ? Math.round(data.recovery.score) : "—"} unit="%" accentVar="--hub-body" sub={data.recovery ? `HRV ${Math.round(data.recovery.hrv ?? 0)} ms · RHR ${Math.round(data.recovery.rhr ?? 0)}` : "Whoop hasn’t sent today yet."} />
        <StatTile label="Sleep" value={data.lastNight?.hours ? `${data.lastNight.hours}h` : "—"} sub={data.lastNight ? `${data.lastNight.performance ? `${Math.round(data.lastNight.performance)}% performance · ` : ""}bedtime ${data.lastNight.bedtime}${data.lastNight.status ? ` · ${STATUS_LABEL[data.lastNight.status]}` : ""}` : "No sleep recorded yet."} />
        <StatTile label="Strain" value={data.strain?.value !== null && data.strain?.value !== undefined ? data.strain.value.toFixed(1) : "—"} sub={data.strain?.inProgress ? "Today so far" : data.strain ? "Yesterday" : "Waiting for Whoop"} />
        <StatTile label="Bedtime tonight" value={data.window.start} unit={`– ${data.window.end}`} sub="Your window, with 10 minutes’ grace." />
      </div>
      <section className="hub-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="hub-eyebrow">Training this week</h2>
          {s ? <RAGChip rag={sessionRag} /> : null}
        </div>
        {s ? (
          <p className="mt-1 text-[15px]">
            <span className="hub-tabular font-semibold">
              {s.done}/{s.target}
            </span>{" "}
            sessions · {s.cardio} cardio of {s.cardioTarget} · {s.strength} strength of {s.strengthTarget}
            {s.scheduled ? <span className="text-ink-2"> · {s.scheduled} booked</span> : null}
          </p>
        ) : null}
        <div className="mt-3">
          <WorkoutList workouts={data.workouts} />
        </div>
      </section>
      <section className="hub-card p-5">
        <SleepBar nights={data.nights} window={data.window} consistency={data.lastNight?.consistency ?? null} />
      </section>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Trend label="Recovery" points={data.series.recovery.map((p) => p.value)} unit="%" band={{ min: 67, max: 100 }} />
        <Trend label="HRV" points={data.series.hrv.map((p) => p.value)} unit="ms" />
        <Trend label="Resting heart rate" points={data.series.rhr.map((p) => p.value)} unit="bpm" />
        <Trend label="Sleep consistency" points={data.series.sleepConsistency.map((p) => p.value)} unit="%" />
        <Trend label="Sleep performance" points={data.series.sleepPerformance.map((p) => p.value)} unit="%" band={{ min: 85, max: 100 }} />
        <Trend label="Weight" points={data.weights.map((w) => w.kg)} unit="kg" />
      </div>
      <section className="hub-card p-5">
        <MedicationList entries={data.medication} />
      </section>
    </div>
  );
}
