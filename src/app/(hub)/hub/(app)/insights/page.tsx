import Link from "next/link";
import { desc } from "drizzle-orm";
import { Bell, CalendarDays, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { db, hasDb } from "@/lib/hub/db/client";
import { insights } from "@/lib/hub/db/schema";
import { formatDayLong } from "@/lib/hub/time";

export const metadata = { title: "Insights" };

const KIND_META: Record<string, { label: string; icon: LucideIcon }> = {
  brief: { label: "Brief", icon: Sparkles },
  review: { label: "Review", icon: CalendarDays },
  nudge: { label: "Nudge", icon: Bell },
};

type Row = { id: string; kind: string; title: string; readAt: Date | null };

function InsightRow({ row }: { row: Row }) {
  const meta = KIND_META[row.kind] ?? { label: row.kind, icon: Bell };
  const Icon = meta.icon;
  return (
    <Link href={`/hub/insights/${row.id}`} className="hub-press flex min-h-[60px] items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint/12 text-tint">
        <Icon size={17} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink-2">{meta.label}</div>
        <div className="truncate text-[15px] font-medium leading-snug">{row.title}</div>
      </div>
      {!row.readAt ? <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-tint" /> : null}
    </Link>
  );
}

export default async function InsightsPage() {
  if (!hasDb) {
    return (
      <>
        <PageHeader title="Insights" />
        <section className="hub-card p-4">
          <p className="text-[15px] font-medium text-warn">The database isn’t connected yet — insights will appear here once it is.</p>
        </section>
      </>
    );
  }

  const rows = await db.select().from(insights).orderBy(desc(insights.createdAt)).limit(100);
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = groups.get(r.forDate) ?? [];
    list.push(r);
    groups.set(r.forDate, list);
  }
  const days = Array.from(groups.keys());

  return (
    <>
      <PageHeader title="Insights" />
      <div className="flex flex-col gap-6">
        {rows.length === 0 ? (
          <section className="hub-card p-5">
            <p className="text-[15px] text-ink-2">Nothing yet — your first brief will land here.</p>
          </section>
        ) : null}
        {days.map((day) => (
          <div key={day}>
            <div className="hub-eyebrow mb-2">{formatDayLong(day)}</div>
            <div className="hub-card divide-y divide-hairline overflow-hidden">
              {(groups.get(day) ?? []).map((row) => (
                <InsightRow key={row.id} row={{ id: row.id, kind: row.kind, title: row.title, readAt: row.readAt }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
