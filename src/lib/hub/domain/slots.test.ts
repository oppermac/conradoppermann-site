import { test } from "node:test";
import assert from "node:assert/strict";
import { findSlots } from "./slots";
import { localToUtc } from "../time";

test("training slots avoid busy time and prefer the morning window", () => {
  const from = localToUtc("2026-09-07", "06:00"); // Monday
  const until = localToUtc("2026-09-13", "23:59");
  const busy = [
    { start: localToUtc("2026-09-07", "07:00"), end: localToUtc("2026-09-07", "08:30") }, // Monday morning taken
    { start: localToUtc("2026-09-07", "12:00"), end: localToUtc("2026-09-07", "14:00") }, // lunch taken
  ];
  const slots = findSlots({ kind: "training", from, until, busy, count: 3 });
  assert.equal(slots.length, 3);
  assert.equal(slots[0].dayKey, "2026-09-07");
  assert.equal(slots[0].label, "Mon 18:00–19:00");
  assert.equal(slots[1].label, "Tue 07:00–08:00");
});

test("friend slots land on evenings and weekend afternoons, never before now + 30 min", () => {
  const from = localToUtc("2026-09-11", "18:45"); // Friday evening
  const until = localToUtc("2026-09-13", "23:59");
  const slots = findSlots({ kind: "friend", from, until, busy: [], count: 3 });
  assert.equal(slots[0].label, "Fri 19:30–21:30");
  assert.equal(slots[1].label, "Sat 12:00–14:00");
  assert.equal(slots[2].label, "Sun 12:00–14:00");
});

test("CEO blocks only on weekday mornings", () => {
  const from = localToUtc("2026-09-12", "08:00"); // Saturday
  const until = localToUtc("2026-09-15", "23:59");
  const slots = findSlots({ kind: "ceo_block", from, until, busy: [], count: 2 });
  assert.deepEqual(
    slots.map((s) => s.label),
    ["Mon 09:00–11:00", "Tue 09:00–11:00"],
  );
});
