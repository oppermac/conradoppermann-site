import { PageHeader } from "../../components/PageHeader";
import { PrintButton } from "./PrintButton";
import { RULES, SHOPPING, TARGETS, WEEK, dayTotal, mealTotal, type Macro, type PlanDay } from "@/lib/hub/meals/plan";

export const metadata = { title: "Food plan" };

const r = (n: number) => Math.round(n).toLocaleString("en-GB");

function MacroCells({ m, bold }: { m: Macro; bold?: boolean }) {
  const cls = `hub-tabular whitespace-nowrap pl-3 text-right ${bold ? "font-semibold text-ink" : "text-ink-2"}`;
  return (
    <>
      <td className={cls}>{r(m.kcal)}</td>
      <td className={cls}>{r(m.p)}</td>
      <td className={cls}>{r(m.c)}</td>
      <td className={cls}>{r(m.f)}</td>
    </>
  );
}

function Delta({ total, target }: { total: Macro; target: Macro }) {
  const d = (a: number, b: number) => {
    const v = Math.round(a - b);
    return v === 0 ? "0" : v > 0 ? `+${v}` : `${v}`;
  };
  const cls = "hub-tabular whitespace-nowrap pl-3 text-right text-[12px] text-ink-3";
  return (
    <>
      <td className={cls}>{d(total.kcal, target.kcal)}</td>
      <td className={cls}>{d(total.p, target.p)}</td>
      <td className={cls}>{d(total.c, target.c)}</td>
      <td className={cls}>{d(total.f, target.f)}</td>
    </>
  );
}

function DayCard({ day }: { day: PlanDay }) {
  const total = dayTotal(day);
  const target = TARGETS[day.kind];
  return (
    <section className="hub-card plan-day p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-bold tracking-tight">{day.day}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${day.kind === "training" ? "bg-tint/12 text-tint" : "bg-ink/6 text-ink-2"}`}>
          {day.kind === "training" ? "Training day" : "Rest day"}
        </span>
      </div>
      <table className="plan-table mt-3 w-full border-collapse text-[14px]">
        <thead>
          <tr className="hub-eyebrow">
            <th className="pb-1.5 text-left font-semibold">Meal</th>
            <th className="pb-1.5 pl-3 text-right font-semibold">kcal</th>
            <th className="pb-1.5 pl-3 text-right font-semibold">P</th>
            <th className="pb-1.5 pl-3 text-right font-semibold">C</th>
            <th className="pb-1.5 pl-3 text-right font-semibold">F</th>
          </tr>
        </thead>
        <tbody>
          {day.meals.map((m) => (
            <tr key={m.slot + m.name} className="border-t border-hairline align-top">
              <td className="py-2 pr-3">
                <div className="font-semibold">{m.name}</div>
                <div className="text-[12.5px] leading-snug text-ink-2">
                  {m.items.map((i) => (i.portion ? `${i.name} ${i.portion}` : i.name)).join(" · ")}
                </div>
                {m.note ? <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{m.note}</div> : null}
              </td>
              <MacroCells m={mealTotal(m)} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink/20">
            <td className="pt-2 font-semibold">Day total</td>
            <MacroCells m={total} bold />
          </tr>
          <tr>
            <td className="text-[12px] text-ink-3">Target {r(target.kcal)} · {target.p} · {target.c} · {target.f}</td>
            <Delta total={total} target={target} />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

export default function PlanPage() {
  return (
    <>
      <PageHeader eyebrow="DARRAGH'S TARGETS · NO GLUTEN, DAIRY, EGGS OR FISH" title="Food plan">
        <PrintButton />
      </PageHeader>

      <section className="hub-card mb-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {(["training", "rest"] as const).map((k) => (
            <div key={k}>
              <div className="hub-eyebrow">{k === "training" ? "Training day · Tue, Thu, Sat" : "Rest day · Mon, Wed, Fri, Sun"}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
                <span><span className="hub-tabular font-semibold">{r(TARGETS[k].kcal)}</span> kcal</span>
                <span><span className="hub-tabular font-semibold">{TARGETS[k].p}</span> g protein</span>
                <span><span className="hub-tabular font-semibold">{TARGETS[k].c}</span> g carbs</span>
                <span><span className="hub-tabular font-semibold">{TARGETS[k].f}</span> g fat</span>
              </div>
            </div>
          ))}
        </div>
        <ul className="mt-4 grid list-disc gap-1 pl-5 text-[13.5px] leading-snug text-ink-2 sm:grid-cols-2 sm:gap-x-6">
          {RULES.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {WEEK.map((d) => (
          <DayCard key={d.day} day={d} />
        ))}
      </div>

      <section className="hub-card plan-shopping mt-5 p-5">
        <h2 className="text-[20px] font-bold tracking-tight">Shopping list</h2>
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SHOPPING.map((g) => (
            <div key={g.group}>
              <div className="hub-eyebrow">{g.group}</div>
              <ul className="mt-1.5 flex flex-col gap-1 text-[14px] leading-snug">
                {g.items.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span aria-hidden className="mt-[5px] h-3 w-3 shrink-0 rounded-[3px] border border-ink/30 print:border-ink" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
