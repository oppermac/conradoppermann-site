import { hasDb } from "../db/client";
import { dailyTotals, isConsistentDay, mealsForDay, recentMeals, totalsForDays } from "../meals/store";
import { DEFAULT_SETTINGS, getSettings } from "../settings";
import { addDays, dayKey as todayKey, dayRange, formatDayShort, weekStart } from "../time";

export async function foodData(day?: string) {
  const dk = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : todayKey();
  if (!hasDb) return { dbConnected: false as const, day: dk, settings: DEFAULT_SETTINGS };
  const { settings } = await getSettings();
  const ws = weekStart(dk);
  const [meals, totals, recent, week] = await Promise.all([mealsForDay(dk), dailyTotals(dk), recentMeals(12), totalsForDays(dayRange(ws, addDays(ws, 6)))]);
  const logged = week.filter((d) => d.meals > 0);
  return {
    dbConnected: true as const,
    day: dk,
    label: formatDayShort(dk),
    prevDay: addDays(dk, -1),
    nextDay: addDays(dk, 1),
    isToday: dk === todayKey(),
    totals,
    targets: settings.nutrition,
    meals: meals.map((m) => ({ id: m.id, name: m.name, slot: m.slot, eatenAt: m.eatenAt.toISOString(), kcal: m.kcal, proteinG: m.proteinG, carbsG: m.carbsG, fatG: m.fatG, photoUrl: m.photoUrl, confidence: m.confidence, items: m.items.map((it) => ({ name: it.name, portion: it.portion, grams: it.grams, kcal: it.kcal, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG })) })),
    recent,
    week: week.map((d) => ({ day: d.day, label: formatDayShort(d.day).slice(0, 3), meals: d.meals, kcal: d.kcal, consistent: isConsistentDay(d, settings.nutrition), isToday: d.day === todayKey(), isFuture: d.day > todayKey() })),
    averages: logged.length ? { kcal: Math.round(logged.reduce((a, b) => a + b.kcal, 0) / logged.length), proteinG: Math.round(logged.reduce((a, b) => a + b.proteinG, 0) / logged.length), days: logged.length } : null,
  };
}

export type FoodData = Awaited<ReturnType<typeof foodData>>;
