import type { WeekData } from "@/lib/hub/queries/week";

type ConnectedWeek = Extract<WeekData, { dbConnected: true }>;

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Dublin" });
}

/** This week's nudges, read or not — a quiet history log rather than the dismissible banners on Today. */
export function NudgeHistory({ nudges }: { nudges: ConnectedWeek["nudges"] }) {
  return (
    <section className="hub-card p-5">
      <h2 className="hub-eyebrow">Nudges this week</h2>
      {nudges.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-2">No nudges yet this week.</p>
      ) : (
        <ul className="mt-1 divide-y divide-hairline">
          {nudges.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink">{n.title}</div>
                <p className="mt-0.5 truncate text-[13px] text-ink-2">{n.body}</p>
              </div>
              <div className="hub-tabular shrink-0 text-[12px] text-ink-3">{fmtWhen(n.createdAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
