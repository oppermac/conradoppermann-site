import Link from "next/link";
import { PageHeader } from "../components/PageHeader";
import { envStatus } from "@/lib/hub/env";
import { dublinParts } from "@/lib/hub/time";

export default function TodayPage() {
  const now = dublinParts();
  const status = envStatus();
  const required = status.filter((s) => s.required);
  const configured = required.filter((s) => s.set).length;
  const eyebrow = `${now.weekday} ${now.day} ${now.month}`.toUpperCase();

  return (
    <>
      <PageHeader eyebrow={eyebrow} title="Today" />
      <section className="hub-card p-5">
        <div className="hub-eyebrow">Phase 0 is live</div>
        <h2 className="mt-1 text-[20px] font-semibold leading-tight">Sign-in, the app shell and the home-screen install.</h2>
        <p className="mt-2 text-[15px] leading-snug text-ink-2">
          Data, Whoop, your calendars, meals, the cups and the coach arrive in the next phases. Add the hub to your
          iPhone home screen now so notifications can work later.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-tile border border-hairline px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold">Setup</div>
            <div className="text-[13px] text-ink-2">
              <span className="hub-tabular">{configured}</span> of <span className="hub-tabular">{required.length}</span>{" "}
              required settings configured
            </div>
          </div>
          <Link href="/hub/settings" className="hub-press shrink-0 whitespace-nowrap text-[15px] font-semibold text-tint">
            Open Settings
          </Link>
        </div>
      </section>
    </>
  );
}
