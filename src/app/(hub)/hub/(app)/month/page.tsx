import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { NotConnected } from "../../components/NotConnected";
import { SCOPE_SEGMENTS, SegmentedControl } from "../../components/viz/SegmentedControl";
import { MonthView } from "../../components/month/MonthView";
import { monthData } from "@/lib/hub/queries/month";

export const metadata = { title: "Month" };

function shiftMonth(mk: string, delta: number): string {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function MonthPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const valid = month && /^\d{4}-\d{2}$/.test(month) ? month : undefined;
  const data = await monthData(valid);
  return (
    <>
      <PageHeader eyebrow="MONTH" title={data.label}>
        <Link href={`/hub/month?month=${shiftMonth(data.monthKey, -1)}`} aria-label="Previous month" className="hub-press flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink-2">
          <ChevronLeft size={18} aria-hidden />
        </Link>
        <Link href={`/hub/month?month=${shiftMonth(data.monthKey, 1)}`} aria-label="Next month" className="hub-press flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink-2">
          <ChevronRight size={18} aria-hidden />
        </Link>
      </PageHeader>
      <div className="mb-5">
        <SegmentedControl segments={SCOPE_SEGMENTS} />
      </div>
      {data.dbConnected ? <MonthView data={data} /> : <NotConnected />}
    </>
  );
}
