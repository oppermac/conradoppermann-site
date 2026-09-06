import { PageHeader } from "../../components/PageHeader";
import { Placeholder } from "../../components/Placeholder";

export const metadata = { title: "Log" };

export default function LogPage() {
  return (
    <>
      <PageHeader title="Log" />
      <Placeholder phase={4} what="Photo meal, repeat meal, activity and check-in." />
    </>
  );
}
