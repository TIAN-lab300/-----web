export const PRIORITIES = Object.freeze([
  "none",
  "low",
  "medium",
  "high",
  "urgent",
]);

export const RECURRENCE_MODES = Object.freeze(["once", "daily", "weekly"]);

export const DEFAULT_PREFERENCES = Object.freeze({
  theme: "system",
  view: "all",
  sortBy: "createdAt",
  sortDirection: "desc",
});

export function createDefaultPreferences() {
  return {
    ...DEFAULT_PREFERENCES,
  };
}

export function normalizePriority(value) {
  return PRIORITIES.includes(value) ? value : "none";
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function createDefaultRecurrence(timeZone) {
  return {
    mode: "once",
    weekdays: [],
    timeZone,
  };
}

export function createExtendedTask(input, options = {}) {
  const source = input || {};
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const startAt = normalizeDate(source.startAt);
  const dueAt = normalizeDate(source.dueAt);
  const timeZone =
    source.recurrence?.timeZone ||
    options.timeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  if (
    !title ||
    !options.id ||
    !options.now ||
    startAt === undefined ||
    dueAt === undefined
  ) {
    return null;
  }

  return {
    id: options.id,
    title,
    completed: Boolean(source.completed),
    createdAt: options.now,
    updatedAt: options.now,
    startAt,
    dueAt,
    recurrence: source.recurrence
      ? {
          mode: RECURRENCE_MODES.includes(source.recurrence.mode)
            ? source.recurrence.mode
            : "once",
          weekdays: Array.isArray(source.recurrence.weekdays)
            ? [...source.recurrence.weekdays]
            : [],
          timeZone,
        }
      : createDefaultRecurrence(timeZone),
    categoryId: source.categoryId || null,
    tagIds: Array.isArray(source.tagIds) ? [...new Set(source.tagIds)] : [],
    priority: normalizePriority(source.priority),
    notes: typeof source.notes === "string" ? source.notes : "",
    subtasks: Array.isArray(source.subtasks) ? [...source.subtasks] : [],
    completionCount: Number.isFinite(source.completionCount)
      ? source.completionCount
      : 0,
    manualOrder: Number.isFinite(options.manualOrder)
      ? options.manualOrder
      : 0,
    seriesId: source.seriesId || null,
    focusSessions: Array.isArray(source.focusSessions)
      ? [...source.focusSessions]
      : [],
  };
}
