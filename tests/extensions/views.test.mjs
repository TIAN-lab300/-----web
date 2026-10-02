import test from "node:test";
import assert from "node:assert/strict";

import {
  getViewCounts,
  getViewTasks,
} from "../../src/extensions/views.js";

const context = {
  now: "2026-10-02T12:00:00+08:00",
  upcomingDays: 7,
};

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "任务",
    completed: false,
    dueAt: null,
    categoryId: null,
    tagIds: [],
    priority: "none",
    manualOrder: 0,
    ...overrides,
  };
}

const tasks = [
  makeTask({
    id: "today",
    dueAt: "2026-10-02T18:00:00+08:00",
    categoryId: "category-life",
    tagIds: ["tag-fitness"],
  }),
  makeTask({
    id: "upcoming",
    dueAt: "2026-10-05T18:00:00+08:00",
    categoryId: "category-study",
    tagIds: ["tag-reading"],
  }),
  makeTask({
    id: "overdue",
    dueAt: "2026-10-01T18:00:00+08:00",
  }),
  makeTask({
    id: "completed",
    completed: true,
  }),
];

test("getViewTasks returns today, upcoming, overdue and completed views", () => {
  assert.deepEqual(getViewTasks(tasks, "today", context).map((task) => task.id), ["today"]);
  assert.deepEqual(
    getViewTasks(tasks, "upcoming", context).map((task) => task.id),
    ["upcoming"],
  );
  assert.deepEqual(
    getViewTasks(tasks, "overdue", context).map((task) => task.id),
    ["overdue"],
  );
  assert.deepEqual(
    getViewTasks(tasks, "completed", context).map((task) => task.id),
    ["completed"],
  );
});

test("getViewTasks supports category and tag view ids", () => {
  assert.deepEqual(
    getViewTasks(tasks, "category:category-life", context).map((task) => task.id),
    ["today"],
  );
  assert.deepEqual(
    getViewTasks(tasks, "tag:tag-reading", context).map((task) => task.id),
    ["upcoming"],
  );
});

test("getViewCounts returns counts for all core views", () => {
  const counts = getViewCounts(tasks, context);

  assert.equal(counts.all, 4);
  assert.equal(counts.today, 1);
  assert.equal(counts.upcoming, 1);
  assert.equal(counts.overdue, 1);
  assert.equal(counts.completed, 1);
});

