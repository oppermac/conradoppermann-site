import { PageHeader } from "../../components/PageHeader";
import { NotConnected } from "../../components/NotConnected";
import { ProgrammeView } from "../../components/programme/ProgrammeView";
import { programmeData } from "@/lib/hub/queries/programme";

export const metadata = { title: "Programme" };

export default async function ProgrammePage() {
  const data = await programmeData();
  return (
    <>
      <PageHeader eyebrow={`WEEK ${data.programme.week} OF ${data.programme.ofWeeks} · ${data.programme.daysLeft} DAYS LEFT`} title="Programme" />
      {data.dbConnected ? <ProgrammeView data={data} /> : <NotConnected />}
    </>
  );
}
