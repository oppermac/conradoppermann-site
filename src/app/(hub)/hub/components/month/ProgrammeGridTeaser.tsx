import Link from "next/link";
import { DOMAIN_META } from "@/lib/hub/domain/programme";
import type { MonthData } from "@/lib/hub/queries/month";

type ConnectedMonth = Extract<MonthData, { dbConnected: true }>;

/** 4 domains × 4 months, weeks-on-track per cell; December shows the outcome text instead. Links through to Programme. */
export function ProgrammeGridTeaser({ programmeGrid }: { programmeGrid: ConnectedMonth["programmeGrid"] }) {
  const months = programmeGrid[0]?.months ?? [];
  return (
    <Link href="/hub/programme" className="hub-press hub-card block p-5">
      <div className="flex items-center justify-between">
        <h2 className="hub-eyebrow">Programme</h2>
        <span className="text-[13px] font-semibold text-tint">Open</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[440px] table-fixed text-left text-[12px]">
          <thead>
            <tr className="text-ink-3">
              <th className="w-[22%] py-1 pr-2 font-semibold" scope="col" />
              {months.map((m, i) => (
                <th key={m.monthKey} className={`py-1 px-1.5 font-semibold ${i === months.length - 1 ? "w-[34%] text-left" : "w-[14.6%] text-center"}`} scope="col">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {programmeGrid.map((row) => (
              <tr key={row.domain}>
                <td className="py-2 pr-2 text-[12px] font-semibold text-ink">{row.label}</td>
                {row.months.map((m, i) => {
                  const isDec = i === row.months.length - 1;
                  return (
                    <td key={m.monthKey} className={`hub-tabular px-1.5 py-2 text-ink-2 ${isDec ? "text-left" : "text-center"}`}>
                      {isDec ? (
                        <span className="line-clamp-2 text-[10.5px] font-medium leading-snug text-ink-3" title={DOMAIN_META[row.domain].outcome}>
                          {DOMAIN_META[row.domain].outcome}
                        </span>
                      ) : (
                        `${m.weeksOnTrack}/${m.weeksElapsed || "–"}`
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Link>
  );
}
