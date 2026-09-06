import { PageHeader } from "../../components/PageHeader";
import { NotConnected } from "../../components/NotConnected";
import { BodyView } from "../../components/body/BodyView";
import { bodyData } from "@/lib/hub/queries/body";

export const metadata = { title: "Body" };

export default async function BodyPage() {
  const data = await bodyData();
  return (
    <>
      <PageHeader title="Body" />
      {data.dbConnected ? <BodyView data={data} /> : <NotConnected />}
    </>
  );
}
