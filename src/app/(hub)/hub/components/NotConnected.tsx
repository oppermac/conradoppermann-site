import Link from "next/link";

export function NotConnected() {
  return (
    <section className="hub-card p-5">
      <div className="hub-eyebrow">Almost there</div>
      <p className="mt-1 text-[15px] leading-snug text-ink-2">
        The database isn’t connected yet. Create the Neon database on the Vercel project, then open Settings to connect
        Whoop and Google.
      </p>
      <Link href="/hub/settings" className="hub-press mt-3 inline-block text-[15px] font-semibold text-tint">
        Open Settings
      </Link>
    </section>
  );
}
