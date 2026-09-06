import { PageHeader } from "../../components/PageHeader";
import { CoachView } from "../../components/coach/CoachView";
import { coachData } from "@/lib/hub/queries/coach";

export const metadata = { title: "Coach" };

function firstParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function CoachPage({ searchParams }: PageProps<"/hub/coach">) {
  const sp = await searchParams;
  const data = await coachData();

  return (
    <>
      <PageHeader title="Coach" />
      <CoachView data={data} seed={firstParam(sp.seed)} initialConversationId={firstParam(sp.c)} />
    </>
  );
}
