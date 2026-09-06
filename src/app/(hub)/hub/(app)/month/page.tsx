import { PageHeader } from "../../components/PageHeader";
import { Placeholder } from "../../components/Placeholder";

export const metadata = { title: "Month" };

export default function MonthPage() {
  return (
    <>
      <PageHeader title="Month" />
      <Placeholder phase={5} what="Heatmap, monthly targets, cup aggregates and trends." />
    </>
  );
}
