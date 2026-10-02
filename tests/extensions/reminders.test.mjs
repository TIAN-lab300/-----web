import test from "node:test";
import assert from "node:assert/strict";

import {
  createReminder,
  createReminderDedupeKey,
  getDueReminderJobs,
  getReminderFireAt,
} from "../../src/extensions/reminders.mjs";

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "健身",
    startAt: null,
    dueAt: "2026-10-03T10:00:00.000Z",
    reminders: [],
    ...overrides,
  };
}

test("createReminder creates a relative reminder", () => {
  const reminder = createReminder(
    {
      anchor: "dueAt",
      offsetMinutes: 30,
    },
    { id: "reminder-1" },
  );

  assert.deepEqual(reminder, {
    id: "reminder-1",
    anchor: "dueAt",
    offsetMinutes: 30,
    enabled: true,
    lastTriggeredAt: null,
  });
});

test("getReminderFireAt subtracts offset minutes from the anchor", () => {
  const task = makeTask();
  const reminder = createReminder(
    {
      anchor: "dueAt",
      offsetMinutes: 30,
    },
    { id: "reminder-1" },
  );

  assert.equal(
    getReminderFireAt(task, reminder),
    "2026-10-03T09:30:00.000Z",
  );
});

test("getDueReminderJobs returns enabled reminders that have arrived", () => {
  const task = makeTask({
    reminders: [
      {
        id: "reminder-1",
        anchor: "dueAt",
        offsetMinutes: 30,
        enabled: true,
        lastTriggeredAt: null,
      },
    ],
  });
  const jobs = getDueReminderJobs(
    [task],
    "2026-10-03T09:45:00.000Z",
  );

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].taskId, "task-1");
  assert.equal(jobs[0].fireAt, "2026-10-03T09:30:00.000Z");
  assert.equal(
    jobs[0].dedupeKey,
    createReminderDedupeKey("reminder-1", "2026-10-03T09:30:00.000Z"),
  );
});

test("getDueReminderJobs ignores triggered and disabled reminders", () => {
  const base = {
    anchor: "dueAt",
    offsetMinutes: 30,
    enabled: true,
    lastTriggeredAt: null,
  };
  const tasks = [
    makeTask({
      reminders: [
        { ...base, id: "triggered", lastTriggeredAt: "2026-10-03T09:30:00.000Z" },
        { ...base, id: "disabled", enabled: false },
      ],
    }),
  ];

  assert.deepEqual(getDueReminderJobs(tasks, "2026-10-03T10:00:00.000Z"), []);
});

