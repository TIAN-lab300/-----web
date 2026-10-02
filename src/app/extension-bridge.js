import {
  DEFAULT_CATEGORIES,
  DEFAULT_TAGS,
} from "../extensions/organization.js";
import { migrateState } from "../extensions/migrations.js";
import { getNextOccurrence } from "../extensions/recurrence.js";
import {
  createDefaultPreferences,
  createExtendedTask,
  normalizePriority,
} from "../extensions/task-schema.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultAppState() {
  return {
    version: 5,
    tasks: [],
    categories: clone(DEFAULT_CATEGORIES),
    tags: clone(DEFAULT_TAGS),
    preferences: createDefaultPreferences(),
  };
}

export function loadAppState(serializedState) {
  if (serializedState === null || serializedState === undefined) {
    return {
      ok: true,
      state: createDefaultAppState(),
    };
  }

  let parsedState;

  try {
    parsedState = JSON.parse(serializedState);
  } catch (error) {
    return {
      ok: false,
      error: "本地数据无法解析。",
    };
  }

  const normalizedState =
    parsedState && parsedState.version === 1
      ? {
          ...parsedState,
          version: 2,
          tasks: (parsedState.tasks || []).map((task) => ({
            ...task,
            dueAt: task.dueAt ?? null,
          })),
        }
      : parsedState;
  const migration = migrateState(normalizedState);

  if (!migration.ok) {
    return migration;
  }

  if (migration.state.categories.length === 0) {
    migration.state.categories = clone(DEFAULT_CATEGORIES);
  }

  if (migration.state.tags.length === 0) {
    migration.state.tags = clone(DEFAULT_TAGS);
  }

  return {
    ok: true,
    state: migration.state,
  };
}

export function serializeAppState(state) {
  return JSON.stringify(state);
}

export function createTaskFromInput(input, options = {}) {
  if (
    !input ||
    !input.dueAt ||
    !input.priority ||
    input.priority === "none"
  ) {
    return null;
  }

  return createExtendedTask(input, options);
}

export function updateTaskOrganization(task, updates = {}, now) {
  return {
    ...task,
    categoryId:
      Object.prototype.hasOwnProperty.call(updates, "categoryId")
        ? updates.categoryId || null
        : task.categoryId,
    tagIds: Array.isArray(updates.tagIds)
      ? [...new Set(updates.tagIds)]
      : task.tagIds || [],
    priority:
      Object.prototype.hasOwnProperty.call(updates, "priority")
        ? normalizePriority(updates.priority)
        : task.priority,
    notes:
      typeof updates.notes === "string" ? updates.notes : task.notes || "",
    recurrence:
      updates.recurrence && typeof updates.recurrence === "object"
        ? {
            mode: updates.recurrence.mode || "once",
            weekdays: Array.isArray(updates.recurrence.weekdays)
              ? [...updates.recurrence.weekdays]
              : [],
            timeZone: updates.recurrence.timeZone || "UTC",
          }
        : task.recurrence,
    updatedAt: now || task.updatedAt,
  };
}

export function appendFocusSession(task, session, now) {
  return {
    ...task,
    focusSessions: [...(task.focusSessions || []), session],
    updatedAt: now || task.updatedAt,
  };
}

export function createNextRecurringTask(task, options = {}) {
  if (
    !task ||
    !task.dueAt ||
    !task.recurrence ||
    task.recurrence.mode === "once"
  ) {
    return null;
  }

  const nextDueAt = getNextOccurrence(
    task.recurrence,
    new Date(task.dueAt),
  );

  if (!nextDueAt || !options.id || !options.now) {
    return null;
  }

  let nextStartAt = null;

  if (task.startAt && task.dueAt) {
    const duration = Date.parse(task.dueAt) - Date.parse(task.startAt);
    nextStartAt = new Date(Date.parse(nextDueAt) - duration).toISOString();
  }

  const next = createExtendedTask(
    {
      ...task,
      completed: false,
      startAt: nextStartAt,
      dueAt: nextDueAt,
      subtasks: (task.subtasks || []).map((subtask) => ({
        ...subtask,
        completed: false,
      })),
      completionCount: 0,
      focusSessions: [],
      seriesId: task.seriesId || task.id,
    },
    {
      id: options.id,
      now: options.now,
      manualOrder: options.manualOrder,
      timeZone: task.recurrence.timeZone,
    },
  );

  return next;
}
