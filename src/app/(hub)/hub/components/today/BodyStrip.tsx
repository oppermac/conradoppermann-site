import type { TodayData } from "@/lib/hub/queries/today";
import { StatTile } from "../viz/StatTile";

type ConnectedToday = Extract<TodayData, { dbConnected: true }>;

function fmtHoursMin(hours: number | null): string | null {
  if (hours === null) return null;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

/** Four stat tiles linking to /hub/body: recovery, sleep, strain, tonight's bedtime window. */
export function BodyStrip({ body }: { body: ConnectedToday["body"] }) {
  const recoveryValue = body.recovery?.score != null ? Math.round(body.recovery.score) : null;
  const sleepHours = fmtHoursMin(body.sleep?.hours ?? null);
  const sleepValue = sleepHours && body.sleep?.performance != null ? `${sleepHours} · ${Math.round(body.sleep.performance)}%` : (sleepHours ?? "–");
  const strainValue = body.strain?.value != null ? body.strain.value.toFixed(1) : null;
  const bedtimeValue = `${body.bedtimeWindow.start}–${body.bedtimeWindow.end}`;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <StatTile label="Recovery" value={<span className="hub-tabular">{recoveryValue ?? "–"}</span>} unit={recoveryValue !== null ? "%" : undefined} href="/hub/body" />
      <StatTile label="Sleep" value={<span className="hub-tabular">{sleepValue}</span>} href="/hub/body" />
      <StatTile label="Strain" value={<span className="hub-tabular">{strainValue ?? "–"}</span>} href="/hub/body" />
      <StatTile label="Bedtime tonight" value={<span className="hub-tabular">{bedtimeValue}</span>} href="/hub/body" />
    </div>
  );
}
