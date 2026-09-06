import { PageHeader } from "../components/PageHeader";
import { NotConnected } from "../components/NotConnected";
import { SCOPE_SEGMENTS, SegmentedControl } from "../components/viz/SegmentedControl";
import { TodayView } from "../components/today/TodayView";
import { todayData } from "@/lib/hub/queries/today";

export default async function TodayPage() {
  const data = await todayData();
  return (
    <>
      <PageHeader eyebrow={data.eyebrow} title="Today" />
      <div className="mb-5">
        <SegmentedControl segments={SCOPE_SEGMENTS} />
      </div>
      {data.dbConnected ? <TodayView data={data} /> : <NotConnected />}
    </>
  );
}
