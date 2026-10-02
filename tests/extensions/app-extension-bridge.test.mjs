import test from "node:test";
import assert from "node:assert/strict";

import {
  appendFocusSession,
  createNextRecurringTask,
  createDefaultAppState,
  createTaskFromInput,
  loadAppState,
  updateTaskOrganization,
} from "../../src/app/extension-bridge.js";

test("createDefaultAppState includes version 5 task collections", () => {
  const state = createDefaultAppState();

  assert.equal(state.version, 5);
  assert.equal(state.tasks.length, 0);
  assert.equal(state.categories.some((category) => category.name === "生活"), true);
  assert.equal(state.tags.some((tag) => tag.name === "健身"), true);
});

test("loadAppState migrates version 2 and seeds default organization", () => {
  const result = loadAppState(
    JSON.stringify({
      version: 2,
      tasks: [
        {
          id: "task-1",
          title: "任务",
          completed: false,
          createdAt: "2026-10-02T10:00:00.000Z",
          updatedAt: "2026-10-02T10:00:00.000Z",
          dueAt: null,
        },
      ],
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.state.version, 5);
  assert.equal(result.state.categories.length >= 2, true);
  assert.equal(result.state.tags.length >= 5, true);
  assert.equal(result.state.tasks[0].priority, "none");
});

test("loadAppState migrates version 1 through version 2 to version 5", () => {
  const result = loadAppState(
    JSON.stringify({
      version: 1,
      tasks: [
        {
          id: "legacy-task",
          title: "旧任务",
          completed: false,
          createdAt: "2026-10-02T10:00:00.000Z",
          updatedAt: "2026-10-02T10:00:00.000Z",
        },
      ],
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.state.version, 5);
  assert.equal(result.state.tasks[0].dueAt, null);
  assert.equal(result.state.tasks[0].focusSessions.length, 0);
});

test("createTaskFromInput creates an extended task", () => {
  const task = createTaskFromInput(
    {
      title: "跑步",
      dueAt: "2026-10-03T10:00:00.000Z",
      categoryId: "category-life",
      tagIds: ["tag-fitness"],
      priority: "high",
      notes: "五公里",
    },
    {
      id: "task-1",
      now: "2026-10-02T10:00:00.000Z",
      timeZone: "Asia/Shanghai",
      manualOrder: 0,
    },
  );

  assert.equal(task.priority, "high");
  assert.deepEqual(task.tagIds, ["tag-fitness"]);
  assert.equal(task.notes, "五公里");
});

test("createTaskFromInput rejects missing due date or priority", () => {
  assert.equal(
    createTaskFromInput(
      { title: "任务", priority: "high" },
      { id: "task-1", now: "2026-10-02T10:00:00.000Z" },
    ),
    null,
  );
  assert.equal(
    createTaskFromInput(
      { title: "任务", dueAt: "2026-10-03T10:00:00.000Z", priority: "none" },
      { id: "task-1", now: "2026-10-02T10:00:00.000Z" },
    ),
    null,
  );
});

test("updateTaskOrganization returns a new task with updated fields", () => {
  const task = createTaskFromInput(
    {
      title: "任务",
      dueAt: "2026-10-03T10:00:00.000Z",
      priority: "medium",
    },
    {
      id: "task-1",
      now: "2026-10-02T10:00:00.000Z",
      timeZone: "UTC",
    },
  );
  const updated = updateTaskOrganization(
    task,
    {
      categoryId: "category-study",
      tagIds: ["tag-reading", "tag-review"],
      priority: "urgent",
      notes: "重点复习",
    },
    "2026-10-02T11:00:00.000Z",
  );

  assert.equal(updated.categoryId, "category-study");
  assert.deepEqual(updated.tagIds, ["tag-reading", "tag-review"]);
  assert.equal(updated.priority, "urgent");
  assert.equal(updated.notes, "重点复习");
  assert.equal(updated.updatedAt, "2026-10-02T11:00:00.000Z");
});

test("appendFocusSession adds a session without mutating the task", () => {
  const task = {
    id: "task-1",
    focusSessions: [],
    updatedAt: "2026-10-02T10:00:00.000Z",
  };
  const session = {
    taskId: "task-1",
    startedAt: "2026-10-02T10:00:00.000Z",
    endedAt: "2026-10-02T10:25:00.000Z",
    durationSeconds: 1500,
  };
  const updated = appendFocusSession(
    task,
    session,
    "2026-10-02T10:25:00.000Z",
  );

  assert.deepEqual(task.focusSessions, []);
  assert.deepEqual(updated.focusSessions, [session]);
  assert.equal(updated.updatedAt, "2026-10-02T10:25:00.000Z");
});

test("createNextRecurringTask creates the next daily occurrence", () => {
  const task = createTaskFromInput(
    {
      title: "每日跑步",
      dueAt: "2026-10-03T10:00:00.000Z",
      priority: "high",
      recurrence: {
        mode: "daily",
        weekdays: [],
        timeZone: "UTC",
      },
    },
    {
      id: "task-1",
      now: "2026-10-02T10:00:00.000Z",
      timeZone: "UTC",
    },
  );
  const next = createNextRecurringTask(task, {
    id: "task-2",
    now: "2026-10-03T11:00:00.000Z",
    manualOrder: 1,
  });

  assert.equal(next.id, "task-2");
  assert.equal(next.dueAt, "2026-10-04T10:00:00.000Z");
  assert.equal(next.completed, false);
  assert.equal(next.seriesId, "task-1");
});
