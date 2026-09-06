/** Everything in the hub is computed in Europe/Dublin. Extended in Phase 1 (weeks, keys, windows). */
export const TZ = "Europe/Dublin";

export type DublinParts = {
  weekday: string;
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
};

export function dublinParts(date: Date = new Date()): DublinParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) if (p.type !== "literal") out[p.type] = p.value;
  return out as DublinParts;
}

/** YYYY-MM-DD in Dublin time. */
export function dublinDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
}
