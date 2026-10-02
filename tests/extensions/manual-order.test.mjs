import test from "node:test";
import assert from "node:assert/strict";

import {
  moveTask,
  reorderTasks,
} from "../../src/extensions/manual-order.js";

function makeTasks() {
  return [
    { id: "a", manualOrder: 0 },
    { id: "b", manualOrder: 1 },
    { id: "c", manualOrder: 2 },
  ];
}

test("reorderTasks moves a task and reindexes manualOrder", () => {
  const reordered = reorderTasks(makeTasks(), "c", 0);

  assert.deepEqual(
    reordered.map((task) => task.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    reordered.map((task) => task.manualOrder),
    [0, 1, 2],
  );
});

test("moveTask moves a task up or down", () => {
  const movedUp = moveTask(makeTasks(), "b", "up");
  const movedDown = moveTask(makeTasks(), "b", "down");

  assert.deepEqual(
    movedUp.map((task) => task.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    movedDown.map((task) => task.id),
    ["a", "c", "b"],
  );
});

test("reorderTasks returns the original list for an unknown task", () => {
  const tasks = makeTasks();

  assert.equal(reorderTasks(tasks, "missing", 0), tasks);
});

