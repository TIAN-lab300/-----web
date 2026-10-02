function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function groupTasksByDate(tasks, range) {
  const startTime = Date.parse(range?.start);
  const endTime = Date.parse(range?.end);
  const groups = new Map();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime >= endTime) {
    return groups;
  }

  for (const task of tasks || []) {
    const value = task.dueAt || task.startAt;
    const taskTime = Date.parse(value);

    if (
      !Number.isFinite(taskTime) ||
      taskTime < startTime ||
      taskTime >= endTime
    ) {
      continue;
    }

    const key = toDateKey(value);
    const group = groups.get(key) || [];
    group.push(task);
    groups.set(key, group);
  }

  return groups;
}

