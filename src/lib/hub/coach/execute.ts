/** Single executor for coach tools (and, in phase 2, the MCP connector). Returns text for the model plus a UI summary. */
import { and, desc, eq, gte } from "drizzle-orm";
import { buildContext } from "../ai/context";
import { db } from "../db/client";
import { activities, calendarEvents, medicationLog, whoopWorkouts } from "../db/schema";
import { computeGapsAndSuggestions } from "../domain/engine";
import { logActivity, parseWhen, setCheckin } from "../domain/log";
import { createHubEvent } from "../google/sync";
import { slotForHour } from "../meals/schema";
import { mealsForDay, recentMeals, repeatMeal, saveMeal, dailyTotals } from "../meals/store";
import { parseMealText } from "../meals/vision";
import { addDays, dayKey, dublin } from "../time";

export type ToolOutcome = { text: string; summary: string; isError?: boolean; data?: unknown };

const HUB_KIND_TITLE: Record<string, string> = { ceo_block: "CEO Block", operating_review: "Operating Review", training: "Training", friend_plan: "Friend plan", family_touchpoint: "Family", date: "Date", enjoyable: "Something enjoyable", memorable: "Memorable", walk: "Walk", rest: "Rest" };

export async function executeTool(name: string, input: Record<string, unknown>): Promise<ToolOutcome> {
  try {
    switch (name) {
      case "get_state": {
        const ctx = await buildContext();
        return { text: JSON.stringify(ctx), summary: "Read the current state" };
      }
      case "get_gaps": {
        const g = await computeGapsAndSuggestions();
        return { text: JSON.stringify({ gaps: g.gaps, suggestions: g.suggestions.map((s) => ({ title: s.title, reason: s.reason, person: s.person?.name, slots: s.slots.map((x) => ({ label: x.label, start: x.start, end: x.end })) })), lowCups: g.lowCups }), summary: `${g.gaps.length} gaps this week` };
      }
      case "log_activity": {
        const row = await logActivity({
          typeId: String(input.type_id),
          title: (input.title as string | null) ?? null,
          occurredAt: (input.occurred_at as string | null) ?? null,
          durationMin: (input.duration_min as number | null) ?? null,
          people: (input.people as string[] | null) ?? null,
          memorable: (input.memorable as boolean | null) ?? null,
          rating: (input.rating as number | null) ?? null,
          notes: (input.notes as string | null) ?? null,
          source: "coach",
        });
        return { text: `Logged ${row.title} (${row.typeId}) on ${row.day}.`, summary: `Logged ${row.title}`, data: { activityId: row.id } };
      }
      case "log_meal": {
        const now = dublin();
        const r = await parseMealText(String(input.text), { timeHint: now.hhmm });
        const slot = (input.slot as "breakfast" | "lunch" | "dinner" | "snack" | null) ?? r.estimate.slot ?? slotForHour(now.hour + now.minute / 60);
        const saved = await saveMeal({
          name: r.estimate.name,
          slot,
          source: "coach",
          items: r.estimate.items.map((it) => ({ name: it.name, portion: it.portion, grams: it.grams, kcal: it.kcal, proteinG: it.protein_g, carbsG: it.carbs_g, fatG: it.fat_g })),
          kcal: r.estimate.totals.kcal,
          proteinG: r.estimate.totals.protein_g,
          carbsG: r.estimate.totals.carbs_g,
          fatG: r.estimate.totals.fat_g,
          fibreG: r.estimate.totals.fibre_g,
          confidence: r.estimate.confidence,
          aiModel: r.model,
        });
        const totals = await dailyTotals(saved.day);
        return { text: `Logged ${r.estimate.name}: ${r.estimate.totals.kcal} kcal, ${Math.round(r.estimate.totals.protein_g)} g protein. Today so far: ${totals.kcal} kcal, ${Math.round(totals.proteinG)} g protein over ${totals.meals} meals.`, summary: `Logged ${r.estimate.name} · ${r.estimate.totals.kcal} kcal`, data: { mealId: saved.id } };
      }
      case "repeat_meal": {
        const q = String(input.query).toLowerCase();
        const recent = await recentMeals(30);
        const match = recent.find((m) => m.name.toLowerCase().includes(q)) ?? recent.find((m) => q.split(/\s+/).some((w) => w.length > 3 && m.name.toLowerCase().includes(w)));
        if (!match) return { text: `No recent meal matches "${input.query}". Recent: ${recent.slice(0, 6).map((m) => m.name).join("; ")}.`, summary: "No matching meal", isError: true };
        const saved = await repeatMeal(match.lastId);
        return { text: `Repeated ${match.name} (${match.kcal} kcal).`, summary: `Repeated ${match.name}`, data: { mealId: saved.id } };
      }
      case "log_medication": {
        const now = new Date();
        const [row] = await db.insert(medicationLog).values({ takenAt: now, day: dayKey(now), name: String(input.name), dose: (input.dose as string | null) ?? null, source: "coach" }).returning();
        return { text: `Added ${row.name}${row.dose ? ` ${row.dose}` : ""} to the medication list.`, summary: `Noted ${row.name}` };
      }
      case "create_calendar_block": {
        const start = parseWhen(String(input.start));
        const end = parseWhen(String(input.end));
        if (end <= start) return { text: "End must be after start.", summary: "Bad times", isError: true };
        const kind = String(input.kind);
        const created = await createHubEvent({ summary: String(input.title) || HUB_KIND_TITLE[kind] || "Block", description: (input.description as string | null) ?? undefined, start, end, hubKind: kind });
        return { text: `Created "${input.title}" ${dublin(start).dayKey} ${dublin(start).hhmm}–${dublin(end).hhmm} in the private calendar.`, summary: `Added to calendar: ${input.title}`, data: { eventId: created.id, calendarId: created.calendarId, htmlLink: created.htmlLink } };
      }
      case "set_checkin": {
        const row = await setCheckin((input.day as string | null) ?? null, {
          mood: (input.mood as number | null) ?? undefined,
          energy: (input.energy as number | null) ?? undefined,
          gratitude: (input.gratitude as string | null) ?? undefined,
          notes: (input.notes as string | null) ?? undefined,
          weightKg: (input.weight_kg as number | null) ?? undefined,
        });
        return { text: `Check-in saved for ${row.day}.`, summary: "Check-in saved" };
      }
      case "list_recent": {
        const days = Math.min(60, Math.max(1, Number(input.days) || 7));
        const since = addDays(dayKey(), -days);
        switch (String(input.what)) {
          case "meals": {
            const rows = await Promise.all([since, addDays(since, 1)].map(() => Promise.resolve()));
            void rows;
            const list: unknown[] = [];
            for (let d = since; d <= dayKey(); d = addDays(d, 1)) for (const m of await mealsForDay(d)) list.push({ day: d, name: m.name, kcal: m.kcal, proteinG: Math.round(m.proteinG) });
            return { text: JSON.stringify(list.slice(-40)), summary: `${list.length} meals` };
          }
          case "activities": {
            const rows = await db.select({ day: activities.day, title: activities.title, typeId: activities.typeId, people: activities.people, rating: activities.rating, memorable: activities.memorable }).from(activities).where(and(gte(activities.day, since), eq(activities.void, false))).orderBy(desc(activities.occurredAt)).limit(40);
            return { text: JSON.stringify(rows), summary: `${rows.length} activities` };
          }
          case "workouts": {
            const rows = await db.select({ day: whoopWorkouts.day, sport: whoopWorkouts.sportName, kind: whoopWorkouts.kind, minutes: whoopWorkouts.durationMin, strain: whoopWorkouts.strain, counts: whoopWorkouts.countsAsSession }).from(whoopWorkouts).where(gte(whoopWorkouts.day, since)).orderBy(desc(whoopWorkouts.start)).limit(40);
            return { text: JSON.stringify(rows), summary: `${rows.length} workouts` };
          }
          default: {
            const from = new Date(Date.now() - days * 86400000);
            const rows = await db.select({ title: calendarEvents.title, start: calendarEvents.start, end: calendarEvents.end, domain: calendarEvents.domain, kind: calendarEvents.kind }).from(calendarEvents).where(and(gte(calendarEvents.start, from), eq(calendarEvents.deleted, false))).orderBy(calendarEvents.start).limit(60);
            return { text: JSON.stringify(rows.map((r) => ({ ...r, start: dublin(r.start).dayKey + " " + dublin(r.start).hhmm }))), summary: `${rows.length} events` };
          }
        }
      }
      default:
        return { text: `Unknown tool ${name}`, summary: "Unknown tool", isError: true };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: `Error: ${msg}`, summary: msg, isError: true };
  }
}
