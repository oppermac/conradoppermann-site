import { envStatus } from "@/lib/hub/env";

export function SetupStatus() {
  const rows = envStatus();
  const groups = Array.from(new Set(rows.map((r) => r.group)));
  return (
    <section className="hub-card p-5">
      <div className="hub-eyebrow">Setup</div>
      <p className="mt-1 text-[15px] text-ink-2">
        Environment variables are read from the Vercel project. Names only are shown here.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g}>
            <div className="text-[13px] font-semibold text-ink-2">{g}</div>
            <ul className="mt-1 divide-y divide-hairline rounded-tile border border-hairline">
              {rows
                .filter((r) => r.group === g)
                .map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2">
                    <code className="truncate text-[13px]">{r.key}</code>
                    <span
                      className={`shrink-0 text-[13px] font-semibold ${
                        r.set ? "text-good" : r.required ? "text-warn" : "text-ink-3"
                      }`}
                    >
                      {r.set ? "Set" : r.required ? "Missing" : "Optional"}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
