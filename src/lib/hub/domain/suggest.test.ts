import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSuggestions, cupsBelowPace, type PersonDue } from "./suggest";
import type { Gap } from "./gaps";

const mum: PersonDue = { id: "p1", name: "Mum", relationship: "family", cadenceDays: 14, lastSeen: "2026-08-16", overdueDays: 7, daysSince: 21 };
const sean: PersonDue = { id: "p2", name: "Sean", relationship: "friend", cadenceDays: 21, lastSeen: "2026-09-01", overdueDays: -16, daysSince: 5 };

test("cups below pace only from mid-week", () => {
  const fills = [{ cup: "oxytocin" as const, drops: 1, capacity: 10 }, { cup: "dopamine" as const, drops: 6, capacity: 10 }];
  assert.deepEqual(cupsBelowPace(fills, 2), []);
  assert.deepEqual(cupsBelowPace(fills, 4), ["oxytocin"]);
});

test("a family gap and a low oxytocin cup merge into one named suggestion", () => {
  const gap: Gap = { id: "family_touchpoint", domain: "relationships", label: "Family touchpoint", target: 1, done: 0, scheduled: 0, gap: 1, risk: "amber", slotKind: "family", typeId: "family_touchpoint", needs: "a family or longstanding-friend touchpoint" };
  const s = buildSuggestions({ gaps: [gap], lowCups: ["oxytocin"], people: [mum, sean], alivenessList: ["Sea swim at the Forty Foot"] });
  assert.equal(s.length, 1);
  assert.equal(s[0].title, "Call or see Mum");
  assert.match(s[0].reason, /haven't seen Mum in 3 weeks/);
  assert.match(s[0].reason, /Oxytocin is low/);
  assert.deepEqual(s[0].gapIds, ["family_touchpoint"]);
});

test("training gaps name the missing kind", () => {
  const gap: Gap = { id: "sessions", domain: "body", label: "Training sessions", target: 4, done: 2, scheduled: 0, gap: 2, risk: "amber", slotKind: "training", typeId: "cardio", needs: "2 strength sessions" };
  const s = buildSuggestions({ gaps: [gap], lowCups: [], people: [], alivenessList: [] });
  assert.equal(s[0].title, "Strength session");
  assert.equal(s[0].typeId, "strength");
});
