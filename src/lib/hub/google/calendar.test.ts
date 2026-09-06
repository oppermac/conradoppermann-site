import { test } from "node:test";
import assert from "node:assert/strict";
import { assertWritable } from "./calendar";

test("the hub never writes outside the chosen private calendar", () => {
  const priv = "c_49c6cab7@group.calendar.google.com";
  assert.doesNotThrow(() => assertWritable(priv, priv));
  assert.throws(() => assertWritable("conrad@maverick-social.com", priv), /only writes to the private calendar/);
  assert.throws(() => assertWritable(priv, null), /Choose your private calendar/);
});
