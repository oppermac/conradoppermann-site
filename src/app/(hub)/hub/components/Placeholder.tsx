export function Placeholder({ phase, what }: { phase: number; what: string }) {
  return (
    <section className="hub-card p-5">
      <div className="hub-eyebrow">Coming in phase {phase}</div>
      <p className="mt-1 text-[15px] text-ink-2">{what}</p>
    </section>
  );
}
