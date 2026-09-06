import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { NotConnected } from "../../components/NotConnected";
import { FoodView } from "../../components/food/FoodView";
import { foodData } from "@/lib/hub/queries/food";

export const metadata = { title: "Food" };

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day } = await searchParams;
  const data = await foodData(day);
  return (
    <>
      <PageHeader eyebrow={data.dbConnected ? data.label.toUpperCase() : undefined} title="Food">
        {data.dbConnected ? (
          <>
            <Link href={`/hub/food?day=${data.prevDay}`} aria-label="Previous day" className="hub-press flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink-2">
              <ChevronLeft size={18} aria-hidden />
            </Link>
            <Link href={`/hub/food?day=${data.nextDay}`} aria-label="Next day" className="hub-press flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink-2">
              <ChevronRight size={18} aria-hidden />
            </Link>
          </>
        ) : null}
      </PageHeader>
      {data.dbConnected ? <FoodView data={data} /> : <NotConnected />}
    </>
  );
}
