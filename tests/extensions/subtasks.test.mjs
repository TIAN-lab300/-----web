import test from "node:test";
import assert from "node:assert/strict";

import {
  addSubtask,
  calculateProgress,
  removeSubtask,
  toggleSubtask,
  updateSubtask,
} from "../../src/extensions/subtasks.js";

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "任务",
    subtasks: [],
    updatedAt: "2026-10-02T10:00:00.000Z",
    ...overrides,
  };
}

test("addSubtask appends a normalized subtask", () => {
  const task = addSubtask(
    makeTask(),
    { title: "  热身  " },
    {
      id: "subtask-1",
      order: 0,
      now: "2026-10-02T11:00:00.000Z",
    },
  );

  assert.deepEqual(task.subtasks, [
    {
      id: "subtask-1",
      title: "热身",
      completed: false,
      order: 0,
    },
  ]);
  assert.equal(task.updatedAt, "2026-10-02T11:00:00.000Z");
});

test("updateSubtask changes title and completion without mutating input", () => {
  const original = makeTask({
    subtasks: [
      {
        id: "subtask-1",
        title: "旧标题",
        completed: false,
        order: 0,
      },
    ],
  });
  const updated = updateSubtask(
    original,
    "subtask-1",
    { title: "新标题", completed: true },
    "2026-10-02T11:00:00.000Z",
  );

  assert.equal(updated.subtasks[0].title, "新标题");
  assert.equal(updated.subtasks[0].completed, true);
  assert.equal(original.subtasks[0].title, "旧标题");
});

test("toggleSubtask and removeSubtask update only the target subtask", () => {
  const task = makeTask({
    subtasks: [
      { id: "subtask-1", title: "第一项", completed: false, order: 0 },
      { id: "subtask-2", title: "第二项", completed: false, order: 1 },
    ],
  });
  const toggled = toggleSubtask(task, "subtask-1");
  const removed = removeSubtask(toggled, "subtask-2");

  assert.equal(toggled.subtasks[0].completed, true);
  assert.deepEqual(removed.subtasks.map((subtask) => subtask.id), ["subtask-1"]);
});

test("calculateProgress returns completed, total and percentage", () => {
  assert.deepEqual(
    calculateProgress(
      makeTask({
        subtasks: [
          { id: "1", completed: true },
          { id: "2", completed: false },
          { id: "3", completed: true },
        ],
      }),
    ),
    {
      completed: 2,
      total: 3,
      percent: 67,
    },
  );
  assert.deepEqual(calculateProgress(makeTask()), {
    completed: 0,
    total: 0,
    percent: 0,
  });
});

