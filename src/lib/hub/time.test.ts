import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  bedtimeStatus,
  dublin,
  hhmmOf,
  localToUtc,
  minutesFrom18,
  weekEnd,
  weekKey,
  weekRange,
  weekStart,
  weekdayOf,
  monthRange,
} from "./time";

test("week boundaries are Monday to Sunday", () => {
  assert.equal(weekStart("2026-09-06"), "2026-08-31"); // Sunday → previous Monday
  assert.equal(weekStart("2026-08-31"), "2026-08-31");
  assert.equal(weekEnd("2026-09-02"), "2026-09-06");
  assert.equal(weekdayOf("2026-09-06"), 7);
  assert.equal(weekdayOf("2026-09-07"), 1);
});

test("ISO week keys and ranges", () => {
  assert.equal(weekKey("2026-09-06"), "2026-W36");
  assert.equal(weekKey("2026-09-07"), "2026-W37");
  assert.equal(weekKey("2026-12-31"), "2026-W53");
  assert.equal(weekKey("2027-01-04"), "2027-W01");
  assert.deepEqual(weekRange("2026-W37"), { start: "2026-09-07", end: "2026-09-13" });
  assert.deepEqual(monthRange("2026-09"), { start: "2026-09-01", end: "2026-09-30" });
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});

test("local → UTC is DST-safe across 25 Oct 2026", () => {
  assert.equal(localToUtc("2026-10-24", "07:00").toISOString(), "2026-10-24T06:00:00.000Z"); // IST (+1)
  assert.equal(localToUtc("2026-10-25", "07:00").toISOString(), "2026-10-25T07:00:00.000Z"); // GMT
  assert.equal(localToUtc("2026-10-25", "00:30").toISOString(), "2026-10-24T23:30:00.000Z"); // still IST
  assert.equal(dublin(new Date("2026-10-24T06:00:00Z")).offsetMinutes, 60);
  assert.equal(dublin(new Date("2026-10-25T07:00:00Z")).offsetMinutes, 0);
  assert.equal(hhmmOf(new Date("2026-09-06T22:15:00Z")), "23:15");
  assert.equal(dublin(new Date("2026-09-06T23:30:00Z")).dayKey, "2026-09-07"); // past midnight in Dublin
});

test("bedtime window maths crosses midnight", () => {
  const w = { start: "22:30", end: "23:30", graceMin: 10 };
  assert.equal(minutesFrom18("22:30"), 270);
  assert.equal(minutesFrom18("00:30"), 390);
  assert.equal(bedtimeStatus("22:00", w), "early");
  assert.equal(bedtimeStatus("23:35", w), "in"); // within grace
  assert.equal(bedtimeStatus("23:45", w), "late");
  assert.equal(bedtimeStatus("00:40", w), "late");
});
