import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPeople, isValidKind, matchRule, structuralDefault } from "./classify";
import { DEFAULT_SETTINGS, PRIMARY_CALENDAR_ID, PRIVATE_TIME_CALENDAR_ID } from "../settings";
import { localToUtc } from "../time";

const rules = [
  { pattern: "dinner with sean", calendarId: null, domain: "relationships", kind: "friend_plan", priority: 1 },
  { pattern: "correspondance", calendarId: null, domain: "none", kind: "none", priority: 5 },
  { pattern: "commercial machine", calendarId: null, domain: "work", kind: "ceo_block", priority: 10 },
  { pattern: "dinner with", calendarId: null, domain: "relationships", kind: "friend_plan", priority: 10 },
];

test("rules match lowercased substrings in priority order", () => {
  assert.equal(matchRule("Commercial Machine", PRIMARY_CALENDAR_ID, rules)?.kind, "ceo_block");
  assert.equal(matchRule("Correspondance", PRIMARY_CALENDAR_ID, rules)?.domain, "none");
  assert.equal(matchRule("Dinner with Sean", PRIVATE_TIME_CALENDAR_ID, rules)?.priority, 1);
  assert.equal(matchRule("Production Meeting", PRIMARY_CALENDAR_ID, rules), null);
});

test("structural defaults: meetings, work hours, private calendar, hub events", () => {
  const base = { allDay: false, attendeesCount: 0, hubCreated: false, hubKind: null as string | null };
  const s = DEFAULT_SETTINGS;
  const mon10 = localToUtc("2026-09-07", "10:00");
  const mon11 = localToUtc("2026-09-07", "11:00");
  assert.equal(structuralDefault({ ...base, calendarId: PRIMARY_CALENDAR_ID, attendeesCount: 3, start: mon10, end: mon11 }, s)?.kind, "meeting");
  assert.equal(structuralDefault({ ...base, calendarId: PRIMARY_CALENDAR_ID, start: mon10, end: mon11 }, s)?.kind, "work_other");
  assert.equal(structuralDefault({ ...base, calendarId: PRIVATE_TIME_CALENDAR_ID, start: mon10, end: mon11 }, s), null);
  const sat = localToUtc("2026-09-12", "10:00");
  assert.equal(structuralDefault({ ...base, calendarId: PRIMARY_CALENDAR_ID, start: sat, end: sat }, s), null);
  assert.equal(structuralDefault({ ...base, calendarId: PRIVATE_TIME_CALENDAR_ID, hubCreated: true, hubKind: "ceo_block", start: mon10, end: mon11 }, s)?.kind, "ceo_block");
  assert.equal(structuralDefault({ ...base, calendarId: PRIMARY_CALENDAR_ID, allDay: true, start: mon10, end: mon11 }, s)?.domain, "none");
});

test("kinds are validated per domain and people are extracted from titles", () => {
  assert.equal(isValidKind("relationships", "friend_plan"), true);
  assert.equal(isValidKind("work", "friend_plan"), false);
  assert.equal(isValidKind("none", "none"), true);
  assert.deepEqual(extractPeople("Dinner with Sean and Aoife"), ["Sean", "Aoife"]);
  assert.deepEqual(extractPeople("Pints w/ Danny"), ["Danny"]);
  assert.equal(extractPeople("Production Meeting"), null);
});
