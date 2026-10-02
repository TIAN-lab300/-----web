export function createReminder(input = {}, options = {}) {
  if (
    !options.id ||
    !["startAt", "dueAt"].includes(input.anchor) ||
    !Number.isFinite(input.offsetMinutes) ||
    input.offsetMinutes < 0
  ) {
    return null;
  }

  return {
    id: options.id,
    anchor: input.anchor,
    offsetMinutes: input.offsetMinutes,
    enabled: input.enabled !== false,
    lastTriggeredAt: input.lastTriggeredAt || null,
  };
}

export function getReminderFireAt(task, reminder, occurrenceAt) {
  const anchorValue = occurrenceAt || task?.[reminder.anchor];
  const anchorTime = Date.parse(anchorValue);

  if (!Number.isFinite(anchorTime) || !Number.isFinite(reminder.offsetMinutes)) {
    return null;
  }

  return new Date(anchorTime - reminder.offsetMinutes * 60 * 1000).toISOString();
}

export function createReminderDedupeKey(reminderId, fireAt) {
  return `${reminderId}:${fireAt}`;
}

export function getDueReminderJobs(tasks, now) {
  const nowTime = Date.parse(now);

  if (!Number.isFinite(nowTime)) {
    return [];
  }

  const jobs = [];

  for (const task of tasks || []) {
    for (const reminder of task.reminders || []) {
      if (!reminder.enabled || reminder.lastTriggeredAt) {
        continue;
      }

      const fireAt = getReminderFireAt(task, reminder);
      const fireTime = Date.parse(fireAt);

      if (!Number.isFinite(fireTime) || fireTime > nowTime) {
        continue;
      }

      jobs.push({
        taskId: task.id,
        reminderId: reminder.id,
        title: task.title,
        fireAt,
        dedupeKey: createReminderDedupeKey(reminder.id, fireAt),
        retryCount: 0,
      });
    }
  }

  return jobs.sort((first, second) => Date.parse(first.fireAt) - Date.parse(second.fireAt));
}

