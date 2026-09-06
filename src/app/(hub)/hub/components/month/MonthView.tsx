import type { MonthData } from "@/lib/hub/queries/month";
import { Heatmap } from "../viz/Heatmap";
import { MonthlyTargetsCard } from "./MonthlyTargetsCard";
import { CupsAggregate } from "./CupsAggregate";
import { TrendsSection } from "./TrendsSection";
import { ProgrammeGridTeaser } from "./ProgrammeGridTeaser";

type ConnectedMonth = Extract<MonthData, { dbConnected: true }>;

/** Month, assembled: the heatmap, monthly targets + cups aggregate, trends, and a programme grid teaser. */
export function MonthView({ data }: { data: ConnectedMonth }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="hub-card p-5">
        <h2 className="hub-eyebrow">{data.label}</h2>
        <div className="mt-3">
          <Heatmap days={data.days} monthLabel={data.label} />
        </div>
      </section>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MonthlyTargetsCard memorable={data.memorable} weeksFullyGreen={data.weeksFullyGreen} weeksTotal={data.weeksTotal} days={data.days} />
        <CupsAggregate cups={data.cups} />
      </div>
      <TrendsSection trends={data.trends} />
      <ProgrammeGridTeaser programmeGrid={data.programmeGrid} />
    </div>
  );
}
