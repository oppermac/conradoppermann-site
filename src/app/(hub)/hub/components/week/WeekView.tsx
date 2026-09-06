import type { WeekData } from "@/lib/hub/queries/week";
import { GapsCard } from "../GapsCard";
import { WeekStrip } from "./WeekStrip";
import { DomainChecklistCard } from "./DomainChecklistCard";
import { CupsGrid } from "./CupsGrid";
import { RocksPanel } from "./RocksPanel";
import { NudgeHistory } from "./NudgeHistory";

type ConnectedWeek = Extract<WeekData, { dbConnected: true }>;

/** Week, assembled: the 7-day strip, this week's gaps (current week only), four domain checklists, cups, rocks, nudge history. */
export function WeekView({ data }: { data: ConnectedWeek }) {
  return (
    <div className="flex flex-col gap-5">
      <WeekStrip days={data.days} />
      {data.isCurrent ? <GapsCard suggestions={data.suggestions} /> : null}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {data.domains.map((d) => (
          <DomainChecklistCard key={d.domain} entry={d} />
        ))}
      </div>
      <CupsGrid cups={data.cups} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RocksPanel rocks={data.rocks} />
        <NudgeHistory nudges={data.nudges} />
      </div>
    </div>
  );
}
