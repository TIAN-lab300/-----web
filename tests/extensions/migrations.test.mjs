import test from "node:test";
import assert from "node:assert/strict";

import { migrateState } from "../../src/extensions/migrations.mjs";

test("migrateState upgrades version 2 data to version 5", () => {
  const result = migrateState({
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
  });

  assert.equal(result.ok, true);
  assert.equal(result.state.version, 5);
  assert.deepEqual(result.state.categories, []);
  assert.deepEqual(result.state.tags, []);
  assert.equal(result.state.tasks[0].priority, "none");
  assert.equal(result.state.tasks[0].notes, "");
  assert.deepEqual(result.state.tasks[0].subtasks, []);
  assert.deepEqual(result.state.tasks[0].focusSessions, []);
});

test("migrateState rejects unsupported versions without mutating input", () => {
  const original = { version: 99, tasks: [] };
  const result = migrateState(original);

  assert.equal(result.ok, false);
  assert.deepEqual(original, { version: 99, tasks: [] });
});

test("migrateState is idempotent for version 5 data", () => {
  const state = {
    version: 5,
    tasks: [],
    categories: [],
    tags: [],
    preferences: {
      theme: "system",
      view: "all",
      sortBy: "manual",
      sortDirection: "asc",
    },
  };
  const result = migrateState(state);

  assert.equal(result.ok, true);
  assert.deepEqual(result.state, state);
});

