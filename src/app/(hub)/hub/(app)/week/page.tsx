import { PageHeader } from "../../components/PageHeader";
import { Placeholder } from "../../components/Placeholder";

export const metadata = { title: "Week" };

export default function WeekPage() {
  return (
    <>
      <PageHeader title="Week" />
      <Placeholder phase={2} what="The 7-day grid, this week's gaps, behaviour checklists and the cups." />
    </>
  );
}
