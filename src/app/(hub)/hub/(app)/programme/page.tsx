import { PageHeader } from "../../components/PageHeader";
import { Placeholder } from "../../components/Placeholder";

export const metadata = { title: "Programme" };

export default function ProgrammePage() {
  return (
    <>
      <PageHeader title="Programme" />
      <Placeholder phase={3} what="The four December outcomes and the Roadmap 2026 mirror." />
    </>
  );
}
