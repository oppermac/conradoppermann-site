/** Registers the intelligence jobs with the tick dispatcher. Times come from Settings (default 07:00 / Sun 18:00). */
import { registerJob } from "../jobs/registry";
import { getSettings } from "../settings";
import { minutesOfDay, weekKey } from "../time";
import { hasAnthropic } from "./anthropic";
import { generateBrief } from "./brief";
import { runNudges } from "./nudges";
import { generateReview } from "./review";

const hourKey = (dayKey: string, hour: number) => `${dayKey}T${String(hour).padStart(2, "0")}`;
const NUDGE_HOURS_WEEKDAY = ["09", "12", "14", "18"];
const NUDGE_HOURS_WEEKEND = ["11", "18"];

registerJob({
  name: "brief",
  due: (now) => (now.minute < 30 ? hourKey(now.dayKey, now.hour) : null),
  run: async ({ now, force }) => {
    if (!hasAnthropic()) return { skipped: "no anthropic key" };
    const { settings } = await getSettings();
    const briefHour = Math.floor(minutesOfDay(settings.notifications.briefTime) / 60);
    if (!force && now.hour !== briefHour) return { skipped: `brief hour is ${briefHour}` };
    const r = await generateBrief({ day: now.dayKey, force });
    return { created: r.created, id: r.insight.id };
  },
});

registerJob({
  name: "review",
  due: (now) => (now.weekday === 7 && now.minute < 30 ? hourKey(now.dayKey, now.hour) : null),
  run: async ({ now, force }) => {
    if (!hasAnthropic()) return { skipped: "no anthropic key" };
    const { settings } = await getSettings();
    const reviewHour = Math.floor(minutesOfDay(settings.notifications.reviewTime) / 60);
    if (!force && now.hour !== reviewHour) return { skipped: `review hour is ${reviewHour}` };
    const r = await generateReview({ weekOf: now.dayKey, force });
    return { created: r.created, id: r.insight.id, week: weekKey(now.dayKey) };
  },
});

registerJob({
  name: "nudges",
  due: (now) => {
    const hh = String(now.hour).padStart(2, "0");
    const weekend = now.weekday >= 6;
    const hours = weekend ? NUDGE_HOURS_WEEKEND : NUDGE_HOURS_WEEKDAY;
    // Half-hour slots so 12:30 / 18:30 evaluations land after lunch and after work; 23:00 for bedtime.
    const slot = now.minute < 30 ? "00" : "30";
    const key = `${now.dayKey}T${hh}:${slot}`;
    if (hh === "23" && slot === "00") return key;
    if (!hours.includes(hh)) return null;
    if ((hh === "12" || hh === "18") && slot !== "30") return null;
    if ((hh === "09" || hh === "14" || hh === "11") && slot !== "00") return null;
    return key;
  },
  run: async ({ now }) => runNudges(now),
});
