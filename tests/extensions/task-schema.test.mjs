import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PREFERENCES,
  createDefaultPreferences,
  createExtendedTask,
  normalizePriority,
} from "../../src/extensions/task-schema.mjs";

test("createExtendedTask fills all extension defaults", () => {
  const task = createExtendedTask(
    {
      title: "  健身  ",
      dueAt: "2026-10-03T10:00:00.000Z",
    },
    {
      id: "task-1",
      now: "2026-10-02T10:00:00.000Z",
      manualOrder: 1,
      timeZone: "UTC",
    },
  );

  assert.deepEqual(task, {
    id: "task-1",
    title: "健身",
    completed: false,
    createdAt: "2026-10-02T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
    startAt: null,
    dueAt: "2026-10-03T10:00:00.000Z",
    recurrence: {
      mode: "once",
      weekdays: [],
      timeZone: "UTC",
    },
    reminders: [],
    categoryId: null,
    tagIds: [],
    priority: "none",
    notes: "",
    subtasks: [],
    completionCount: 0,
    manualOrder: 1,
    seriesId: null,
    focusSessions: [],
  });
});

test("createExtendedTask rejects empty titles and invalid dates", () => {
  assert.equal(createExtendedTask({ title: " " }, { id: "task-1", now: "now" }), null);
  assert.equal(
    createExtendedTask(
      { title: "任务", dueAt: "not-a-date" },
      { id: "task-1", now: "2026-10-02T10:00:00.000Z" },
    ),
    null,
  );
});

test("normalizePriority falls back to none", () => {
  assert.equal(normalizePriority("urgent"), "urgent");
  assert.equal(normalizePriority("invalid"), "none");
  assert.equal(normalizePriority(null), "none");
});

test("createDefaultPreferences returns a fresh preference object", () => {
  const first = createDefaultPreferences();
  const second = createDefaultPreferences();

  assert.deepEqual(first, DEFAULT_PREFERENCES);
  assert.notEqual(first, second);
});
