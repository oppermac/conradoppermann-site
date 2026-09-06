import { asc } from "drizzle-orm";
import { getSettings } from "@/lib/hub/settings";
import { db } from "@/lib/hub/db/client";
import { people as peopleTable } from "@/lib/hub/db/schema";
import { PageHeader } from "../../components/PageHeader";
import { SetupStatus } from "../../components/SetupStatus";
import { LogoutButton } from "../../components/LogoutButton";
import {
  AlivenessListSection,
  CalendarsSection,
  CupsSection,
  DbNotice,
  NotificationsSection,
  NutritionSection,
  PeopleSection,
  SleepSection,
  TargetsSection,
  WorkHoursSection,
} from "./SettingsSections";
import { IntegrationsSection } from "./IntegrationsSection";
import { IntelligenceSection } from "./IntelligenceSection";
import { InstallSection } from "./InstallSection";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { settings, dbConnected } = await getSettings();

  const people = dbConnected
    ? (await db.select().from(peopleTable).orderBy(asc(peopleTable.name))).map((p) => ({
        id: p.id,
        name: p.name,
        relationship: p.relationship,
        cadenceDays: p.cadenceDays,
      }))
    : [];

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4">
        {!dbConnected ? <DbNotice /> : null}
        <IntegrationsSection />
        <TargetsSection initial={settings.targets} dbConnected={dbConnected} />
        <NutritionSection initial={settings.nutrition} dbConnected={dbConnected} />
        <SleepSection initial={settings.sleep} dbConnected={dbConnected} />
        <CalendarsSection initial={settings.calendars} dbConnected={dbConnected} />
        <PeopleSection initial={people} dbConnected={dbConnected} />
        <AlivenessListSection initial={settings.aliveness} dbConnected={dbConnected} />
        <NotificationsSection initial={settings.notifications} dbConnected={dbConnected} />
        <IntelligenceSection />
        <WorkHoursSection initial={settings.workHours} dbConnected={dbConnected} />
        <CupsSection initial={settings.cups} dbConnected={dbConnected} />
        <InstallSection />
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
