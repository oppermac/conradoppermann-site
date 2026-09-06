import { test } from "node:test";
import assert from "node:assert/strict";
import { gapOf, ragAtEnd, riskNow, ringProgress, weekFullyGreen, type BehaviourFacts } from "./kpis";
import { programmePosition, PROGRAMME_WEEKS, PROGRAMME_DAYS } from "./programme";

const f = (id: BehaviourFacts["id"], done: number, scheduled: number, target: number, extra: Partial<BehaviourFacts> = {}) =>
  ({ id, done, scheduled, target, ...extra }) as BehaviourFacts;

test("gaps look forward: scheduled counts", () => {
  assert.equal(gapOf(f("sessions", 1, 2, 4)), 1);
  assert.equal(gapOf(f("friend_plans", 2, 1, 2)), 0);
});

test("week-end RAG per behaviour", () => {
  assert.equal(ragAtEnd(f("ceo_blocks", 3, 0, 3)), "green");
  assert.equal(ragAtEnd(f("ceo_blocks", 2, 0, 3)), "amber");
  assert.equal(ragAtEnd(f("sessions", 4, 0, 4, { cardioDone: 2, strengthDone: 2 })), "green");
  assert.equal(ragAtEnd(f("sessions", 4, 0, 4, { cardioDone: 4, strengthDone: 0 })), "amber");
  assert.equal(ragAtEnd(f("sessions", 2, 0, 4)), "red");
  assert.equal(ragAtEnd(f("bedtime", 3, 0, 5, { nightsWithData: 3 })), "amber");
  assert.equal(ragAtEnd(f("friend_plans", 1, 0, 2)), "amber");
});

test("in-week risk fires from Wednesday and respects scheduled items", () => {
  assert.equal(riskNow(f("sessions", 0, 0, 4), 2, 19), "none"); // Tuesday: quiet
  assert.equal(riskNow(f("sessions", 0, 0, 4), 3, 19), "amber"); // Wednesday evening, nothing done
  assert.equal(riskNow(f("sessions", 1, 1, 4), 3, 19), "none"); // one done + one booked
  assert.equal(riskNow(f("sessions", 0, 0, 4), 5, 19), "red"); // Friday: 3 left, 2 days
  assert.equal(riskNow(f("friend_plans", 0, 1, 2), 4, 19), "amber"); // Thursday: one booked, one missing
  assert.equal(riskNow(f("friend_plans", 0, 0, 2), 4, 19), "red");
  assert.equal(riskNow(f("ceo_blocks", 0, 1, 3), 1, 9), "amber"); // Monday morning, only one block booked
  assert.equal(riskNow(f("memorable", 0, 0, 1), 3, 12, 21), "amber");
});

test("ring progress and fully-green week", () => {
  assert.equal(ringProgress([f("ceo_blocks", 3, 0, 3), f("operating_review", 0, 0, 1)]), 0.5);
  assert.equal(
    weekFullyGreen([
      f("ceo_blocks", 3, 0, 3),
      f("operating_review", 1, 0, 1),
      f("sessions", 4, 0, 4, { cardioDone: 2, strengthDone: 2 }),
      f("meals", 5, 0, 5),
      f("bedtime", 5, 0, 5),
      f("friend_plans", 2, 0, 2),
      f("family_touchpoint", 1, 0, 1),
      f("enjoyable", 1, 0, 1),
    ]),
    true,
  );
});

test("programme position", () => {
  assert.equal(PROGRAMME_WEEKS, 18);
  assert.equal(PROGRAMME_DAYS, 122);
  const p = programmePosition("2026-09-06");
  assert.equal(p.day, 6);
  assert.equal(p.week, 1);
  assert.equal(p.weekStart, "2026-08-31");
  assert.equal(programmePosition("2026-09-07").week, 2);
  assert.equal(programmePosition("2026-12-31").week, 18);
});
