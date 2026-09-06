/** Label / hero value / secondary line. Whole tile is a 44pt+ target when `href` is given. */
import Link from "next/link";

export function StatTile({
  label,
  value,
  unit,
  sub,
  accentVar,
  href,
  children,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  accentVar?: string;
  href?: string;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="text-[13px] font-semibold text-ink-2">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[28px] font-semibold leading-none tracking-[-0.02em]" style={accentVar ? { color: `var(${accentVar})` } : undefined}>
          {value}
        </span>
        {unit ? <span className="text-[13px] font-medium text-ink-3">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-1 text-[13px] leading-snug text-ink-2">{sub}</div> : null}
      {children}
    </>
  );
  const cls = "hub-elevated block min-h-[88px] rounded-tile p-3.5";
  return href ? (
    <Link href={href} className={`${cls} hub-press`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
