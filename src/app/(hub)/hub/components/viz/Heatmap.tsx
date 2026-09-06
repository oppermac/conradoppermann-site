"use client";

import { useState } from "react";
import { Table2 } from "lucide-react";
import { weekdayOf, type DayKey } from "@/lib/hub/time";

export type HeatmapDay = {
  day: number;
  dayKey: DayKey;
  domainsTouched: number;
  recovery: number | null;
  sleep: "in" | "late" | "early" | null;
  isToday: boolean;
  isFuture: boolean;
};

type Mode = "domains" | "recovery" | "sleep";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "domains", label: "Domains" },
  { id: "recovery", label: "Recovery" },
  { id: "sleep", label: "Sleep" },
];

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function cellStyle(day: HeatmapDay, mode: Mode): { background: string; label: string } {
  if (day.isFuture) return { background: "transparent", label: "Still to come" };
  if (mode === "domains") {
    if (day.domainsTouched <= 0) return { background: "transparent", label: "No domains touched" };
    const alpha = Math.round((0.18 + (day.domainsTouched / 4) * 0.72) * 100);
    return { background: `color-mix(in srgb, var(--hub-tint) ${alpha}%, transparent)`, label: `${day.domainsTouched} of 4 domains touched` };
  }
  if (mode === "recovery") {
    if (day.recovery === null) return { background: "transparent", label: "No recovery data" };
    const alpha = Math.round((0.15 + (Math.max(0, Math.min(100, day.recovery)) / 100) * 0.75) * 100);
    return { background: `color-mix(in srgb, var(--hub-body) ${alpha}%, transparent)`, label: `${Math.round(day.recovery)}% recovery` };
  }
  if (day.sleep === null) return { background: "transparent", label: "No sleep data" };
  if (day.sleep === "late") return { background: "color-mix(in srgb, var(--hub-warn-fill) 60%, transparent)", label: "Bedtime late" };
  const alpha = day.sleep === "early" ? 55 : 78;
  return { background: `color-mix(in srgb, var(--hub-body) ${alpha}%, transparent)`, label: day.sleep === "early" ? "Bedtime early" : "In the bedtime window" };
}

/**
 * A 7-column (Mon–Sun) month heatmap with a Domains / Recovery / Sleep mode toggle, each mode a single
 * hue ramped by alpha. A "Table" toggle renders the same data as a table for anyone who can't read colour.
 */
export function Heatmap({ days, monthLabel }: { days: HeatmapDay[]; monthLabel: string }) {
  const [mode, setMode] = useState<Mode>("domains");
  const [showTable, setShowTable] = useState(false);
  const firstDow = days.length ? weekdayOf(days[0].dayKey) : 1; // 1=Mon..7=Sun
  const cells: Array<HeatmapDay | null> = [...(Array(firstDow - 1).fill(null) as null[]), ...days];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="hub-chrome inline-flex rounded-control p-0.5" role="tablist" aria-label="Heatmap mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`hub-press rounded-[10px] px-2.5 py-1 text-[12px] font-semibold ${mode === m.id ? "bg-elevated text-ink" : "text-ink-2"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((t) => !t)}
          aria-pressed={showTable}
          aria-label="Show as table"
          className={`hub-press flex h-8 items-center gap-1.5 rounded-control border border-hairline px-2.5 text-[12px] font-semibold ${showTable ? "bg-tint/12 text-tint" : "text-ink-2"}`}
        >
          <Table2 size={14} aria-hidden />
          Table
        </button>
      </div>

      {showTable ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{monthLabel} by day: domains touched, recovery and sleep</caption>
            <thead>
              <tr className="text-ink-3">
                <th className="py-1 pr-3 font-semibold" scope="col">
                  Day
                </th>
                <th className="py-1 pr-3 font-semibold" scope="col">
                  Domains
                </th>
                <th className="py-1 pr-3 font-semibold" scope="col">
                  Recovery
                </th>
                <th className="py-1 font-semibold" scope="col">
                  Sleep
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {days.map((d) => (
                <tr key={d.dayKey}>
                  <td className="hub-tabular py-1.5 pr-3">
                    {d.day}
                    {d.isToday ? " · today" : ""}
                  </td>
                  <td className="hub-tabular py-1.5 pr-3">{d.isFuture ? "—" : `${d.domainsTouched}/4`}</td>
                  <td className="hub-tabular py-1.5 pr-3">{d.recovery !== null ? `${Math.round(d.recovery)}%` : "—"}</td>
                  <td className="py-1.5">{d.sleep ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-ink-3">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (!d) return <div key={`blank-${i}`} aria-hidden />;
              const { background, label } = cellStyle(d, mode);
              return (
                <div
                  key={d.dayKey}
                  title={`${monthLabel} ${d.day} · ${label}`}
                  className={`hub-tabular flex aspect-square items-center justify-center rounded-[4px] text-[11px] ${d.isToday ? "ring-2 ring-tint" : "ring-1 ring-hairline"} ${d.isFuture ? "text-ink-3" : "text-ink-2"}`}
                  style={{ background }}
                >
                  {d.day}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
