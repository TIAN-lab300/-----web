import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReminderSchedule,
  createSyncQueueEntry,
} from "../../src/extensions/reminder-sync.mjs";

const context = {
  scheduleVersion: 12,
  timeZone: "Asia/Shanghai",
};

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "健身",
    startAt: null,
    dueAt: "2026-10-03T10:00:00.000Z",
    recurrence: { mode: "once", weekdays: [], timeZone: "Asia/Shanghai" },
    reminders: [
      {
        id: "reminder-1",
        anchor: "dueAt",
        offsetMinutes: 30,
        enabled: true,
      },
    ],
    ...overrides,
  };
}

test("buildReminderSchedule creates a versioned snapshot", () => {
  const snapshot = buildReminderSchedule([makeTask()], context);

  assert.equal(snapshot.scheduleVersion, 12);
  assert.equal(snapshot.reminders.length, 1);
  assert.equal(snapshot.reminders[0].fireAt, "2026-10-03T09:30:00.000Z");
  assert.equal(snapshot.reminders[0].timeZone, "Asia/Shanghai");
});

test("buildReminderSchedule skips disabled and invalid reminders", () => {
  const snapshot = buildReminderSchedule(
    [
      makeTask({
        reminders: [
          {
            id: "disabled",
            anchor: "dueAt",
            offsetMinutes: 30,
            enabled: false,
          },
          {
            id: "invalid",
            anchor: "missing",
            offsetMinutes: 30,
            enabled: true,
          },
        ],
      }),
    ],
    context,
  );

  assert.deepEqual(snapshot.reminders, []);
});

test("createSyncQueueEntry creates pending sync state", () => {
  const entry = createSyncQueueEntry(
    { acceptedVersion: 11, attempts: 2 },
    { scheduleVersion: 12, reminders: [] },
  );

  assert.deepEqual(entry, {
    scheduleVersion: 12,
    attempts: 2,
    status: "pending",
  });
});

test("createSyncQueueEntry marks stale snapshots as synced", () => {
  const entry = createSyncQueueEntry(
    { acceptedVersion: 12, attempts: 0 },
    { scheduleVersion: 12, reminders: [] },
  );

  assert.equal(entry.status, "synced");
});

