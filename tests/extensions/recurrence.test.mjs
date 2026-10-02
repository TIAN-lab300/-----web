import test from "node:test";
import assert from "node:assert/strict";

import { getNextOccurrence } from "../../src/extensions/recurrence.js";

test("getNextOccurrence returns null for a one-time rule", () => {
  assert.equal(
    getNextOccurrence(
      { mode: "once", weekdays: [] },
      new Date(2026, 9, 2, 10, 0, 0),
    ),
    null,
  );
});

test("getNextOccurrence advances daily tasks by one local day", () => {
  const from = new Date(2026, 9, 2, 10, 30, 0);
  const next = new Date(getNextOccurrence({ mode: "daily" }, from));

  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 9);
  assert.equal(next.getDate(), 3);
  assert.equal(next.getHours(), 10);
  assert.equal(next.getMinutes(), 30);
});

test("getNextOccurrence finds the next selected weekday", () => {
  const from = new Date(2026, 9, 2, 10, 0, 0);
  const next = new Date(
    getNextOccurrence(
      {
        mode: "weekly",
        weekdays: [1],
      },
      from,
    ),
  );

  assert.equal(next.getDay(), 1);
  assert.equal(next.getDate(), 5);
});

test("getNextOccurrence rejects malformed rules and dates", () => {
  assert.equal(getNextOccurrence({ mode: "weekly", weekdays: [] }, new Date()), null);
  assert.equal(getNextOccurrence({ mode: "daily" }, new Date("invalid")), null);
});

