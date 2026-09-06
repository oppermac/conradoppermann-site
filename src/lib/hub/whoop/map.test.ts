import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySport, decideSession, localDayFor, localHHMM, offsetMinutes } from "./map";

const targets = { minSessionMin: 20, walkCardioMin: 45, walkCardioStrain: 8 };

test("timezone offsets and local days", () => {
  assert.equal(offsetMinutes("+01:00"), 60);
  assert.equal(offsetMinutes("-05:30"), -330);
  assert.equal(offsetMinutes("Z"), 0);
  assert.equal(localDayFor("2026-09-06T23:30:00.000Z", "+01:00"), "2026-09-07");
  assert.equal(localHHMM("2026-09-06T22:40:00.000Z", "+01:00"), "23:40");
});

test("sport classification and session decisions", () => {
  assert.deepEqual(classifySport("Running"), { kind: "cardio", category: undefined });
  assert.equal(classifySport("Weightlifting").kind, "strength");
  assert.equal(classifySport("Functional Fitness").kind, "mixed");
  assert.equal(classifySport("Padel").category, "racket");
  assert.equal(classifySport("Gaelic Football").category, "team");
  assert.equal(classifySport("Babywearing").kind, "other");
  assert.equal(classifySport("Boxing", { boxing: "mixed" }).kind, "mixed");

  assert.equal(decideSession(classifySport("Running"), "Running", 35, 9, targets).countsAsSession, true);
  assert.equal(decideSession(classifySport("Running"), "Running", 15, 9, targets).countsAsSession, false);
  assert.equal(decideSession(classifySport("Swimming"), "Swimming", 16, 8, targets).countsAsSession, true);
  assert.equal(decideSession(classifySport("Padel"), "Padel", 25, 9, targets).countsAsSession, false);
  assert.equal(decideSession(classifySport("Padel"), "Padel", 45, 9, targets).typeId, "team_sport");
  const walk = decideSession(classifySport("Walking"), "Walking", 50, 9, targets);
  assert.equal(walk.effectiveKind, "cardio");
  assert.equal(walk.countsAsSession, true);
  const stroll = decideSession(classifySport("Walking"), "Walking", 35, 4, targets);
  assert.equal(stroll.countsAsSession, false);
  assert.equal(stroll.typeId, "walk");
  assert.equal(decideSession(classifySport("Sauna"), "Sauna", 15, 1, targets).typeId, "sauna_cold");
  assert.equal(decideSession(classifySport("Golf"), "Golf", 120, 6, targets).typeId, "nature");
});
