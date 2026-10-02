import { createDefaultPreferences } from "./task-schema.js";

const CURRENT_VERSION = 5;
const SUPPORTED_VERSIONS = new Set([2, 3, 4, 5]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function migrateVersion2To3(state) {
  return {
    ...state,
    version: 3,
    categories: Array.isArray(state.categories) ? state.categories : [],
    tags: Array.isArray(state.tags) ? state.tags : [],
    preferences: state.preferences || createDefaultPreferences(),
    tasks: state.tasks.map((task, index) => ({
      ...task,
      priority: task.priority || "none",
      notes: typeof task.notes === "string" ? task.notes : "",
      categoryId: task.categoryId || null,
      tagIds: Array.isArray(task.tagIds) ? task.tagIds : [],
      completionCount: Number.isFinite(task.completionCount)
        ? task.completionCount
        : 0,
      manualOrder: Number.isFinite(task.manualOrder)
        ? task.manualOrder
        : index,
    })),
  };
}

function migrateVersion3To4(state) {
  return {
    ...state,
    version: 4,
    tasks: state.tasks.map((task) => ({
      ...task,
      startAt: task.startAt || null,
      recurrence: task.recurrence || {
        mode: "once",
        weekdays: [],
        timeZone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      seriesId: task.seriesId || null,
    })),
  };
}

function migrateVersion4To5(state) {
  return {
    ...state,
    version: 5,
    tasks: state.tasks.map((task) => ({
      ...task,
      focusSessions: Array.isArray(task.focusSessions)
        ? task.focusSessions
        : [],
    })),
  };
}

export function migrateState(state) {
  if (
    !state ||
    typeof state !== "object" ||
    !SUPPORTED_VERSIONS.has(state.version) ||
    !Array.isArray(state.tasks)
  ) {
    return {
      ok: false,
      error: "Unsupported state version.",
    };
  }

  let migrated = clone(state);

  if (migrated.version === 2) {
    migrated = migrateVersion2To3(migrated);
  }

  if (migrated.version === 3) {
    migrated = migrateVersion3To4(migrated);
  }

  if (migrated.version === 4) {
    migrated = migrateVersion4To5(migrated);
  }

  if (migrated.version !== CURRENT_VERSION) {
    return {
      ok: false,
      error: "Migration did not reach the current version.",
    };
  }

  return {
    ok: true,
    state: migrated,
  };
}
