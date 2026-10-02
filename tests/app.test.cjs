const test = require("node:test");
const assert = require("node:assert/strict");

const {
  FILTERS,
  normalizeTitle,
  createTask,
  updateTaskTitle,
  toggleTaskCompletion,
  removeTask,
  sortTasks,
  filterTasks,
  countRemainingTasks,
  STORAGE_KEY,
  STORAGE_VERSION,
  normalizeDueAt,
  parseStoredState,
  createStorageAdapter,
  generateTaskId,
  getEmptyStateMessage,
  updateTask,
  isTaskOverdue,
  toDateTimeLocalValue,
  formatDueAt,
} = require("../app.js");

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "完成第一版",
    completed: false,
    createdAt: "2026-09-30T10:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
    dueAt: null,
    ...overrides,
  };
}

test("normalizeTitle trims title and rejects whitespace only content", () => {
  assert.equal(normalizeTitle("  完成第一版  "), "完成第一版");
  assert.equal(normalizeTitle("   "), "");
  assert.equal(normalizeTitle(null), "");
});

test("createTask creates an incomplete task with timestamps", () => {
  const task = createTask("  完成第一版  ", {
    id: "task-1",
    now: "2026-09-30T10:00:00.000Z",
  });

  assert.deepEqual(task, makeTask());
});

test("createTask stores a normalized due date", () => {
  const dueAt = "2026-10-01T10:00";
  const task = createTask("完成第一版", {
    id: "task-1",
    now: "2026-09-30T10:00:00.000Z",
    dueAt,
  });

  assert.equal(task.dueAt, new Date(dueAt).toISOString());
});

test("normalizeDueAt accepts empty values and rejects invalid values", () => {
  assert.equal(normalizeDueAt(""), null);
  assert.equal(normalizeDueAt(null), null);
  assert.equal(normalizeDueAt("not-a-date"), undefined);
});

test("createTask rejects an empty title", () => {
  assert.equal(createTask("   ", { id: "task-1", now: "2026-09-30T10:00:00.000Z" }), null);
});

test("updateTaskTitle returns a new task list and updates the timestamp", () => {
  const tasks = [makeTask()];
  const updated = updateTaskTitle(
    tasks,
    "task-1",
    "  更新后的任务  ",
    "2026-09-30T11:00:00.000Z",
  );

  assert.notEqual(updated, tasks);
  assert.equal(updated[0].title, "更新后的任务");
  assert.equal(updated[0].updatedAt, "2026-09-30T11:00:00.000Z");
  assert.equal(tasks[0].title, "完成第一版");
});

test("updateTaskTitle rejects an empty title", () => {
  const tasks = [makeTask()];
  const updated = updateTaskTitle(
    tasks,
    "task-1",
    "   ",
    "2026-09-30T11:00:00.000Z",
  );

  assert.equal(updated, tasks);
});

test("updateTask updates title and due date together", () => {
  const tasks = [makeTask()];
  const dueAt = "2026-10-02T12:30";
  const updated = updateTask(
    tasks,
    "task-1",
    {
      title: "更新后的任务",
      dueAt,
    },
    "2026-09-30T11:00:00.000Z",
  );

  assert.equal(updated[0].title, "更新后的任务");
  assert.equal(updated[0].dueAt, new Date(dueAt).toISOString());
  assert.equal(updated[0].updatedAt, "2026-09-30T11:00:00.000Z");
});

test("updateTask can clear a due date", () => {
  const tasks = [makeTask({ dueAt: "2026-10-02T12:30:00.000Z" })];
  const updated = updateTask(
    tasks,
    "task-1",
    {
      title: "任务",
      dueAt: "",
    },
    "2026-09-30T11:00:00.000Z",
  );

  assert.equal(updated[0].dueAt, null);
});

test("toggleTaskCompletion toggles only the target task", () => {
  const tasks = [makeTask(), makeTask({ id: "task-2", title: "第二项" })];
  const updated = toggleTaskCompletion(tasks, "task-1", "2026-09-30T11:00:00.000Z");

  assert.equal(updated[0].completed, true);
  assert.equal(updated[0].updatedAt, "2026-09-30T11:00:00.000Z");
  assert.equal(updated[1].completed, false);
  assert.equal(tasks[0].completed, false);
});

test("removeTask removes only the target task", () => {
  const tasks = [makeTask(), makeTask({ id: "task-2", title: "第二项" })];
  const updated = removeTask(tasks, "task-1");

  assert.deepEqual(updated, [tasks[1]]);
  assert.equal(tasks.length, 2);
});

test("sortTasks returns newest tasks first without mutating input", () => {
  const first = makeTask({ id: "new", createdAt: "2026-09-30T12:00:00.000Z" });
  const second = makeTask({ id: "old", createdAt: "2026-09-30T09:00:00.000Z" });
  const tasks = [second, first];

  assert.deepEqual(
    sortTasks(tasks).map((task) => task.id),
    ["new", "old"],
  );
  assert.deepEqual(
    tasks.map((task) => task.id),
    ["old", "new"],
  );
});

test("filterTasks supports all, active, and completed filters", () => {
  const active = makeTask({ id: "active", completed: false });
  const completed = makeTask({
    id: "completed",
    completed: true,
    createdAt: "2026-09-30T11:00:00.000Z",
  });

  assert.equal(filterTasks([active, completed], FILTERS.ALL).length, 2);
  assert.deepEqual(
    filterTasks([active, completed], FILTERS.ACTIVE).map((task) => task.id),
    ["active"],
  );
  assert.deepEqual(
    filterTasks([active, completed], FILTERS.COMPLETED).map((task) => task.id),
    ["completed"],
  );
});

test("countRemainingTasks counts incomplete tasks only", () => {
  assert.equal(
    countRemainingTasks([
      makeTask({ completed: false }),
      makeTask({ id: "done", completed: true }),
      makeTask({ id: "open", completed: false }),
    ]),
    2,
  );
});

test("parseStoredState returns an empty task list for missing storage", () => {
  assert.deepEqual(parseStoredState(null), {
    ok: true,
    tasks: [],
  });
});

test("parseStoredState rejects malformed JSON", () => {
  const result = parseStoredState("{broken json");

  assert.equal(result.ok, false);
  assert.equal(typeof result.error, "string");
});

test("parseStoredState rejects an unsupported version", () => {
  const result = parseStoredState(
    JSON.stringify({
      version: STORAGE_VERSION + 1,
      tasks: [],
    }),
  );

  assert.equal(result.ok, false);
});

test("parseStoredState rejects duplicate task identifiers", () => {
  const result = parseStoredState(
    JSON.stringify({
      version: STORAGE_VERSION,
      tasks: [makeTask(), makeTask()],
    }),
  );

  assert.equal(result.ok, false);
});

test("parseStoredState migrates version 1 tasks to version 2", () => {
  const legacyTask = makeTask();
  delete legacyTask.dueAt;
  const result = parseStoredState(
    JSON.stringify({
      version: 1,
      tasks: [legacyTask],
    }),
  );

  assert.deepEqual(result, {
    ok: true,
    tasks: [makeTask()],
  });
});

test("parseStoredState rejects an invalid due date in version 2", () => {
  const result = parseStoredState(
    JSON.stringify({
      version: STORAGE_VERSION,
      tasks: [makeTask({ dueAt: "not-a-date" })],
    }),
  );

  assert.equal(result.ok, false);
});

test("parseStoredState returns validated tasks", () => {
  const result = parseStoredState(
    JSON.stringify({
      version: STORAGE_VERSION,
      tasks: [makeTask()],
    }),
  );

  assert.deepEqual(result, {
    ok: true,
    tasks: [makeTask()],
  });
});

test("storage adapter loads and saves versioned task data", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  const adapter = createStorageAdapter(storage);
  const loadResult = adapter.load();

  assert.equal(loadResult.storageAvailable, true);
  assert.deepEqual(loadResult.tasks, []);

  const saveResult = adapter.save([makeTask()]);

  assert.equal(saveResult.ok, true);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), {
    version: STORAGE_VERSION,
    tasks: [makeTask()],
  });
});

test("storage adapter reports unavailable storage without throwing", () => {
  const storage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  const adapter = createStorageAdapter(storage);
  const loadResult = adapter.load();
  const saveResult = adapter.save([makeTask()]);

  assert.equal(loadResult.storageAvailable, false);
  assert.equal(typeof loadResult.notice, "string");
  assert.equal(saveResult.ok, false);
  assert.equal(typeof saveResult.notice, "string");
});

test("generateTaskId returns a unique identifier when the first candidate is taken", () => {
  const identifier = generateTaskId(new Set(["fixed-id"]), {
    randomUUID() {
      return "fixed-id";
    },
  });

  assert.equal(identifier, "fixed-id-2");
});

test("generateTaskId falls back when randomUUID is unavailable", () => {
  const identifier = generateTaskId(new Set(), undefined, () => 123456789);

  assert.equal(identifier.startsWith("task-123456789-"), true);
});

test("getEmptyStateMessage distinguishes empty storage from filtered results", () => {
  assert.equal(getEmptyStateMessage(0, FILTERS.ALL), "还没有任务，先添加一项吧。");
  assert.equal(getEmptyStateMessage(2, FILTERS.ACTIVE), "没有未完成任务。");
  assert.equal(getEmptyStateMessage(2, FILTERS.COMPLETED), "还没有已完成任务。");
});

test("isTaskOverdue returns true only for incomplete tasks past their due date", () => {
  const now = "2026-10-01T10:00:00.000Z";

  assert.equal(
    isTaskOverdue(
      makeTask({ completed: false, dueAt: "2026-10-01T09:59:00.000Z" }),
      now,
    ),
    true,
  );
  assert.equal(
    isTaskOverdue(
      makeTask({ completed: true, dueAt: "2026-10-01T09:59:00.000Z" }),
      now,
    ),
    false,
  );
  assert.equal(isTaskOverdue(makeTask({ dueAt: null }), now), false);
});

test("toDateTimeLocalValue converts an ISO date back to a local input value", () => {
  const inputValue = "2026-10-01T10:00";
  const isoValue = new Date(inputValue).toISOString();

  assert.equal(toDateTimeLocalValue(isoValue), inputValue);
  assert.equal(toDateTimeLocalValue(null), "");
});

test("formatDueAt returns a localized non-empty date string", () => {
  const formatted = formatDueAt("2026-10-01T10:00:00.000Z");

  assert.equal(typeof formatted, "string");
  assert.equal(formatted.includes("2026"), true);
  assert.equal(formatDueAt(null), "");
});
