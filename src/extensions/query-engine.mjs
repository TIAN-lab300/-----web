const PRIORITY_WEIGHTS = Object.freeze({
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
});

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
}

function compareNullableDates(firstValue, secondValue, direction) {
  const first = firstValue ? Date.parse(firstValue) : Number.POSITIVE_INFINITY;
  const second = secondValue
    ? Date.parse(secondValue)
    : Number.POSITIVE_INFINITY;
  const multiplier = direction === "desc" ? -1 : 1;

  return (first - second) * multiplier;
}

function compareByField(first, second, sortBy) {
  if (sortBy === "priority") {
    return (
      PRIORITY_WEIGHTS[first.priority] - PRIORITY_WEIGHTS[second.priority]
    );
  }

  if (sortBy === "completionCount") {
    return (first.completionCount || 0) - (second.completionCount || 0);
  }

  if (sortBy === "title") {
    return first.title.localeCompare(second.title, "zh-CN");
  }

  if (sortBy === "manual") {
    return (first.manualOrder || 0) - (second.manualOrder || 0);
  }

  if (sortBy === "dueAt") {
    return Date.parse(first.dueAt || "") - Date.parse(second.dueAt || "");
  }

  if (sortBy === "updatedAt") {
    return Date.parse(first.updatedAt) - Date.parse(second.updatedAt);
  }

  return Date.parse(first.createdAt) - Date.parse(second.createdAt);
}

export function sortTasks(tasks, sortBy = "manual", direction = "asc") {
  const multiplier = direction === "desc" ? -1 : 1;

  return [...tasks].sort((first, second) => {
    let result;

    if (["dueAt", "updatedAt", "createdAt"].includes(sortBy)) {
      const value =
        sortBy === "dueAt"
          ? [first.dueAt, second.dueAt]
          : sortBy === "updatedAt"
            ? [first.updatedAt, second.updatedAt]
            : [first.createdAt, second.createdAt];
      result = compareNullableDates(value[0], value[1], "asc");
    } else {
      result = compareByField(first, second, sortBy);
    }

    if (result === 0) {
      result = first.id.localeCompare(second.id);
    }

    return result * multiplier;
  });
}

function getTaskSearchText(task, context) {
  const category = context.categories?.find(
    (item) => item.id === task.categoryId,
  );
  const tags = (context.tags || []).filter((item) =>
    (task.tagIds || []).includes(item.id),
  );
  const subtaskTitles = (task.subtasks || []).map((subtask) => subtask.title);

  return normalizeText(
    [
      task.title,
      task.notes,
      category?.name,
      ...tags.map((tag) => tag.name),
      ...subtaskTitles,
    ].join(" "),
  );
}

function matchesStatus(task, status, now) {
  if (status === "active") {
    return !task.completed;
  }

  if (status === "completed") {
    return Boolean(task.completed);
  }

  if (status === "overdue") {
    return (
      !task.completed &&
      Boolean(task.dueAt) &&
      Date.parse(task.dueAt) < Date.parse(now)
    );
  }

  return true;
}

export function queryTasks(tasks, query = {}, context = {}) {
  const searchText = normalizeText(query.text);
  const categoryIds = query.categoryIds || [];
  const tagIds = query.tagIds || [];
  const priorities = query.priorities || [];

  return tasks.filter((task) => {
    if (!matchesStatus(task, query.status || "all", context.now)) {
      return false;
    }

    if (categoryIds.length > 0 && !categoryIds.includes(task.categoryId)) {
      return false;
    }

    if (
      tagIds.length > 0 &&
      !tagIds.some((tagId) => (task.tagIds || []).includes(tagId))
    ) {
      return false;
    }

    if (priorities.length > 0 && !priorities.includes(task.priority)) {
      return false;
    }

    if (
      searchText &&
      !getTaskSearchText(task, context).includes(searchText)
    ) {
      return false;
    }

    return true;
  });
}

