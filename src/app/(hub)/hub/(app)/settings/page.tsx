import { PageHeader } from "../../components/PageHeader";
import { SetupStatus } from "../../components/SetupStatus";
import { LogoutButton } from "../../components/LogoutButton";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4">
        <SetupStatus />
        <section className="hub-card p-5">
          <div className="hub-eyebrow">Security</div>
          <p className="mt-1 text-[15px] text-ink-2">You stay signed in on this device for 90 days.</p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </section>
      </div>
    </>
  );
}
