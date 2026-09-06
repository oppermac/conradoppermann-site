import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { NotConnected } from "../../components/NotConnected";
import { SCOPE_SEGMENTS, SegmentedControl } from "../../components/viz/SegmentedControl";
import { WeekView } from "../../components/week/WeekView";
import { weekData } from "@/lib/hub/queries/week";
import { addDays } from "@/lib/hub/time";

export const metadata = { title: "Week" };

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day } = await searchParams;
  const valid = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined;
  const data = await weekData(valid);
  const prev = addDays(data.weekStart, -7);
  const next = addDays(data.weekStart, 7);
  return (
    <>
      <PageHeader eyebrow={`${data.label} · programme week ${data.programme.week} of ${data.programme.ofWeeks}`.toUpperCase()} title={`Week ${data.programme.week}`}>
        <Link href={`/hub/week?day=${prev}`} aria-label="Previous week" className="hub-press flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink-2">
          <ChevronLeft size={18} aria-hidden />
        </Link>
        <Link href={`/hub/week?day=${next}`} aria-label="Next week" className="hub-press flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink-2">
          <ChevronRight size={18} aria-hidden />
        </Link>
      </PageHeader>
      <div className="mb-5">
        <SegmentedControl segments={SCOPE_SEGMENTS} />
      </div>
      {data.dbConnected ? <WeekView data={data} /> : <NotConnected />}
    </>
  );
}
