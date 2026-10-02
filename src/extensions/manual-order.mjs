function orderTasks(tasks) {
  return [...tasks].sort((first, second) => {
    const firstOrder = Number.isFinite(first.manualOrder)
      ? first.manualOrder
      : Number.MAX_SAFE_INTEGER;
    const secondOrder = Number.isFinite(second.manualOrder)
      ? second.manualOrder
      : Number.MAX_SAFE_INTEGER;

    return firstOrder - secondOrder;
  });
}

function reindex(tasks) {
  return tasks.map((task, index) => ({
    ...task,
    manualOrder: index,
  }));
}

export function reorderTasks(tasks, taskId, targetIndex) {
  const ordered = orderTasks(tasks);
  const sourceIndex = ordered.findIndex((task) => task.id === taskId);

  if (sourceIndex === -1) {
    return tasks;
  }

  const next = [...ordered];
  const [moved] = next.splice(sourceIndex, 1);
  const boundedIndex = Math.max(0, Math.min(targetIndex, next.length));
  next.splice(boundedIndex, 0, moved);

  return reindex(next);
}

export function moveTask(tasks, taskId, direction) {
  const ordered = orderTasks(tasks);
  const sourceIndex = ordered.findIndex((task) => task.id === taskId);

  if (sourceIndex === -1 || !["up", "down"].includes(direction)) {
    return tasks;
  }

  const targetIndex = direction === "up" ? sourceIndex - 1 : sourceIndex + 1;

  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return tasks;
  }

  return reorderTasks(ordered, taskId, targetIndex);
}

