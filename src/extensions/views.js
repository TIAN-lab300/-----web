import { queryTasks } from "./query-engine.js";

function getLocalDayBounds(nowValue) {
  const now = new Date(nowValue);
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

function getTaskDate(task) {
  const value = task.dueAt || task.startAt;
  return value ? Date.parse(value) : Number.NaN;
}

export function getViewTasks(tasks, viewId, context = {}) {
  const nowTime = Date.parse(context.now);
  const dayBounds = getLocalDayBounds(context.now);

  if (viewId === "completed") {
    return tasks.filter((task) => task.completed);
  }

  if (viewId === "overdue") {
    return tasks.filter((task) => {
      const taskTime = getTaskDate(task);
      return !task.completed && Number.isFinite(taskTime) && taskTime < nowTime;
    });
  }

  if (viewId === "today") {
    return tasks.filter((task) => {
      const taskTime = getTaskDate(task);
      return (
        Number.isFinite(taskTime) &&
        taskTime >= dayBounds.start &&
        taskTime < dayBounds.end
      );
    });
  }

  if (viewId === "upcoming") {
    const upcomingEnd =
      dayBounds.end +
      Math.max(0, context.upcomingDays || 7) * 24 * 60 * 60 * 1000;

    return tasks.filter((task) => {
      const taskTime = getTaskDate(task);
      return (
        !task.completed &&
        Number.isFinite(taskTime) &&
        taskTime >= dayBounds.end &&
        taskTime <= upcomingEnd
      );
    });
  }

  if (viewId.startsWith("category:")) {
    const categoryId = viewId.slice("category:".length);
    return tasks.filter((task) => task.categoryId === categoryId);
  }

  if (viewId.startsWith("tag:")) {
    const tagId = viewId.slice("tag:".length);
    return tasks.filter((task) => (task.tagIds || []).includes(tagId));
  }

  return [...tasks];
}

export function getViewCounts(tasks, context = {}) {
  return {
    all: tasks.length,
    today: getViewTasks(tasks, "today", context).length,
    upcoming: getViewTasks(tasks, "upcoming", context).length,
    overdue: getViewTasks(tasks, "overdue", context).length,
    completed: getViewTasks(tasks, "completed", context).length,
  };
}

