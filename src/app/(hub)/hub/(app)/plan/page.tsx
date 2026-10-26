import { PageHeader } from "../../components/PageHeader";
import { NotConnected } from "../../components/NotConnected";
import { PlanBuilder } from "../../components/plan/PlanBuilder";
import { hasDb } from "@/lib/hub/db/client";
import { getPlan } from "@/lib/hub/meals/plan-store";

export const metadata = { title: "Food plan" };
export const dynamic = "force-dynamic";

/** The week, built from set meals and library foods. Totals, deltas and the shopping list follow what's placed. */
export default async function PlanPage() {
  if (!hasDb) {
    return (
      <>
        <PageHeader eyebrow="WEEKLY PLAN" title="Food plan" />
        <NotConnected />
      </>
    );
  }
  const data = await getPlan();
  return (
    <>
      <PageHeader eyebrow="WEEKLY PLAN · DARRAGH'S TARGETS" title="Food plan" />
      <PlanBuilder initial={data} />
    </>
  );
}
