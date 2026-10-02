import test from "node:test";
import assert from "node:assert/strict";

import {
  queryTasks,
  sortTasks,
} from "../../src/extensions/query-engine.js";

const context = {
  now: "2026-10-02T12:00:00+08:00",
  upcomingDays: 7,
  categories: [
    { id: "category-life", name: "生活" },
    { id: "category-study", name: "学习" },
  ],
  tags: [
    { id: "tag-fitness", name: "健身" },
    { id: "tag-reading", name: "阅读" },
  ],
};

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "任务",
    completed: false,
    createdAt: "2026-10-02T08:00:00+08:00",
    updatedAt: "2026-10-02T08:00:00+08:00",
    startAt: null,
    dueAt: null,
    categoryId: null,
    tagIds: [],
    priority: "none",
    notes: "",
    subtasks: [],
    completionCount: 0,
    manualOrder: 0,
    ...overrides,
  };
}

const tasks = [
  makeTask({
    id: "fitness",
    title: "跑步",
    dueAt: "2026-10-02T18:00:00+08:00",
    categoryId: "category-life",
    tagIds: ["tag-fitness"],
    priority: "high",
    manualOrder: 2,
  }),
  makeTask({
    id: "reading",
    title: "阅读一章",
    categoryId: "category-study",
    tagIds: ["tag-reading"],
    priority: "medium",
    notes: "重点看第三章",
    manualOrder: 1,
  }),
  makeTask({
    id: "overdue",
    title: "交作业",
    dueAt: "2026-10-01T18:00:00+08:00",
    categoryId: "category-study",
    priority: "urgent",
    completed: false,
    manualOrder: 0,
  }),
];

test("queryTasks searches title, notes, categories and tags", () => {
  assert.deepEqual(
    queryTasks(tasks, { text: "健身" }, context).map((task) => task.id),
    ["fitness"],
  );
  assert.deepEqual(
    queryTasks(tasks, { text: "第三章" }, context).map((task) => task.id),
    ["reading"],
  );
  assert.deepEqual(
    queryTasks(tasks, { text: "学习" }, context).map((task) => task.id),
    ["reading", "overdue"],
  );
});

test("queryTasks combines category, tag and priority filters", () => {
  const result = queryTasks(
    tasks,
    {
      categoryIds: ["category-life"],
      tagIds: ["tag-fitness"],
      priorities: ["high"],
    },
    context,
  );

  assert.deepEqual(result.map((task) => task.id), ["fitness"]);
});

test("queryTasks supports active, completed and overdue status", () => {
  assert.deepEqual(
    queryTasks(tasks, { status: "active" }, context).map((task) => task.id),
    ["fitness", "reading", "overdue"],
  );
  assert.deepEqual(
    queryTasks(tasks, { status: "overdue" }, context).map((task) => task.id),
    ["overdue"],
  );
});

test("sortTasks supports priority and manual order", () => {
  assert.deepEqual(
    sortTasks(tasks, "priority", "desc").map((task) => task.id),
    ["overdue", "fitness", "reading"],
  );
  assert.deepEqual(
    sortTasks(tasks, "manual", "asc").map((task) => task.id),
    ["overdue", "reading", "fitness"],
  );
});

test("queryTasks does not mutate input tasks", () => {
  const snapshot = JSON.stringify(tasks);

  queryTasks(tasks, { text: "阅读" }, context);
  sortTasks(tasks, "dueAt", "asc");

  assert.equal(JSON.stringify(tasks), snapshot);
});

