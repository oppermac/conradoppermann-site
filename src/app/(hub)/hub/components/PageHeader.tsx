import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="hub-eyebrow">{eyebrow}</div> : null}
        <h1 className="hub-title mt-0.5 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <Link
          href="/hub/settings"
          aria-label="Settings"
          className="hub-press flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-page lg:hidden"
        >
          CO
        </Link>
      </div>
    </header>
  );
}
