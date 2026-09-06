import { PageHeader } from "../../components/PageHeader";
import { Placeholder } from "../../components/Placeholder";

export const metadata = { title: "Body" };

export default function BodyPage() {
  return (
    <>
      <PageHeader title="Body" />
      <Placeholder phase={2} what="Recovery, sleep, strain and your training log from Whoop." />
    </>
  );
}
