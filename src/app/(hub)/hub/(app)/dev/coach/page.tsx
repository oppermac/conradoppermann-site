import { notFound } from "next/navigation";
import { PageHeader } from "../../../components/PageHeader";
import { CoachView } from "../../../components/coach/CoachView";
import { BriefDetail, ReviewDetail } from "../../insights/[id]/page";
import { FIXTURE_BRIEF, FIXTURE_COACH_DATA, FIXTURE_REVIEW, FIXTURE_THREAD_ITEMS } from "@/lib/hub/fixtures/coach";

export const metadata = { title: "Coach fixtures" };

/** No network, no database — renders CoachView and the insight detail views against static fixtures. */
export default function DevCoachPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <PageHeader eyebrow="Dev fixtures" title="Coach" />
      <div className="flex flex-col gap-6">
        <CoachView data={FIXTURE_COACH_DATA} initialItems={FIXTURE_THREAD_ITEMS} network={false} />

        <section className="flex flex-col gap-4">
          <div className="hub-eyebrow">Insight detail — brief</div>
          <BriefDetail id="fixture-brief-1" forDate="2026-09-06" readAt={null} brief={FIXTURE_BRIEF} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="hub-eyebrow">Insight detail — review</div>
          <ReviewDetail id="fixture-review-1" forDate="2026-09-06" readAt={new Date().toISOString()} review={FIXTURE_REVIEW} />
        </section>
      </div>
    </>
  );
}
