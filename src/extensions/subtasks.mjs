function normalizeSubtaskTitle(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function addSubtask(task, input = {}, options = {}) {
  const title = normalizeSubtaskTitle(input.title);

  if (!task || !title || !options.id) {
    return task;
  }

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];

  return {
    ...task,
    subtasks: [
      ...subtasks,
      {
        id: options.id,
        title,
        completed: false,
        order: Number.isFinite(options.order)
          ? options.order
          : subtasks.length,
      },
    ],
    updatedAt: options.now || task.updatedAt,
  };
}

export function updateSubtask(task, subtaskId, updates = {}, now) {
  if (!task || !Array.isArray(task.subtasks)) {
    return task;
  }

  const title =
    Object.prototype.hasOwnProperty.call(updates, "title") &&
    typeof updates.title === "string"
      ? updates.title.trim()
      : undefined;

  if (title === "") {
    return task;
  }

  return {
    ...task,
    subtasks: task.subtasks.map((subtask) =>
      subtask.id === subtaskId
        ? {
            ...subtask,
            ...(title !== undefined ? { title } : {}),
            ...(typeof updates.completed === "boolean"
              ? { completed: updates.completed }
              : {}),
          }
        : subtask,
    ),
    updatedAt: now || task.updatedAt,
  };
}

export function toggleSubtask(task, subtaskId) {
  if (!task || !Array.isArray(task.subtasks)) {
    return task;
  }

  const target = task.subtasks.find((subtask) => subtask.id === subtaskId);

  if (!target) {
    return task;
  }

  return updateSubtask(
    task,
    subtaskId,
    { completed: !target.completed },
    task.updatedAt,
  );
}

export function removeSubtask(task, subtaskId) {
  if (!task || !Array.isArray(task.subtasks)) {
    return task;
  }

  const remaining = task.subtasks.filter((subtask) => subtask.id !== subtaskId);

  if (remaining.length === task.subtasks.length) {
    return task;
  }

  return {
    ...task,
    subtasks: remaining.map((subtask, index) => ({
      ...subtask,
      order: index,
    })),
  };
}

export function calculateProgress(task) {
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const total = subtasks.length;
  const completed = subtasks.filter((subtask) => subtask.completed).length;

  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

