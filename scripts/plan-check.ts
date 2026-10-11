import { WEEK, TARGETS, dayTotal, mealTotal } from "../src/lib/hub/meals/plan";
for (const d of WEEK) {
  const t = dayTotal(d); const g = TARGETS[d.kind];
  const pct = (a: number, b: number) => `${Math.round(((a - b) / b) * 100)}%`;
  console.log(`${d.short} ${d.kind.padEnd(8)} ${Math.round(t.kcal)} kcal (${pct(t.kcal, g.kcal)})  P${Math.round(t.p)} (${pct(t.p,g.p)})  C${Math.round(t.c)} (${pct(t.c,g.c)})  F${Math.round(t.f)} (${pct(t.f,g.f)})`);
  for (const m of d.meals) { const x = mealTotal(m); console.log(`    ${m.name.padEnd(40)} ${Math.round(x.kcal)} / ${Math.round(x.p)} / ${Math.round(x.c)} / ${Math.round(x.f)}`); }
}
