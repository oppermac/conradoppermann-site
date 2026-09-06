import { PageHeader } from "../../components/PageHeader";
import { Placeholder } from "../../components/Placeholder";

export const metadata = { title: "Coach" };

export default function CoachPage() {
  return (
    <>
      <PageHeader title="Coach" />
      <Placeholder phase={6} what="The morning brief and the ask-anytime coach." />
    </>
  );
}
