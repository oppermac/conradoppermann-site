import { PageHeader } from "../../components/PageHeader";
import { LogInline } from "./LogInline";

export const metadata = { title: "Log" };

export default async function LogPage({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const { panel } = await searchParams;
  const initial = (["menu", "photo", "repeat", "activity", "checkin", "text", "medication", "weight", "memorable"] as const).find((p) => p === panel) ?? "menu";
  return (
    <>
      <PageHeader title="Log" />
      <LogInline initial={initial} />
    </>
  );
}
