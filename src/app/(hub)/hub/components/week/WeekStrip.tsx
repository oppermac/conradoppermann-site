import type { WeekData } from "@/lib/hub/queries/week";
import { DOMAIN_META, DOMAINS, type Domain } from "@/lib/hub/domain/programme";

type ConnectedWeek = Extract<WeekData, { dbConnected: true }>;

function DomainDot({ domain, touched, scheduled }: { domain: Domain; touched: boolean; scheduled: boolean }) {
  const meta = DOMAIN_META[domain];
  const color = `var(${meta.colorVar})`;
  if (touched) return <span title={meta.label} className="h-2 w-2 rounded-full" style={{ background: color }} />;
  if (scheduled) return <span title={`${meta.label} · scheduled`} className="h-2 w-2 rounded-full border-[1.5px]" style={{ borderColor: color }} />;
  return <span title={meta.label} className="h-2 w-2 rounded-full border border-hairline" aria-hidden />;
}

function SleepTick({ sleep }: { sleep: "in" | "late" | "early" | null }) {
  if (!sleep) return <span className="h-1 w-4 rounded-full bg-hairline" aria-hidden />;
  const color = sleep === "late" ? "var(--hub-warn-fill)" : "var(--hub-body)";
  return <span title={`Bedtime ${sleep}`} className="h-1 w-4 rounded-full" style={{ background: color }} />;
}

/** Mon–Sun strip: date, four domain dots (filled = touched, ring = scheduled, hollow = neither), a sleep tick. */
export function WeekStrip({ days }: { days: ConnectedWeek["days"] }) {
  return (
    <div className="hub-card grid grid-cols-7 gap-0.5 p-3 sm:gap-1.5 sm:p-4">
      {days.map((d) => (
        <div
          key={d.day}
          className={`flex flex-col items-center gap-1.5 rounded-tile py-2 ${d.isToday ? "ring-2 ring-tint" : ""} ${d.isPast && !d.isToday ? "opacity-45" : ""}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{d.label}</div>
          <div className="hub-tabular text-[15px] font-semibold text-ink">{d.date}</div>
          <div className="flex items-center gap-1">
            {DOMAINS.map((dom) => (
              <DomainDot key={dom} domain={dom} touched={d.touched.includes(dom)} scheduled={d.scheduled.includes(dom)} />
            ))}
          </div>
          <SleepTick sleep={d.sleep} />
        </div>
      ))}
    </div>
  );
}
