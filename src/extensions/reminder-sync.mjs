import { getReminderFireAt } from "./reminders.mjs";

export function buildReminderSchedule(tasks, context = {}) {
  const scheduleVersion = Number.isFinite(context.scheduleVersion)
    ? context.scheduleVersion
    : 1;
  const reminders = [];

  for (const task of tasks || []) {
    for (const reminder of task.reminders || []) {
      if (!reminder.enabled) {
        continue;
      }

      const fireAt = getReminderFireAt(task, reminder);

      if (!fireAt) {
        continue;
      }

      reminders.push({
        id: reminder.id,
        taskId: task.id,
        title: task.title,
        anchor: reminder.anchor,
        fireAt,
        timeZone:
          task.recurrence?.timeZone || context.timeZone || "UTC",
        recurrence: task.recurrence || {
          mode: "once",
          weekdays: [],
          timeZone: context.timeZone || "UTC",
        },
        enabled: true,
        scheduleVersion,
      });
    }
  }

  return {
    scheduleVersion,
    reminders,
  };
}

export function createSyncQueueEntry(previous, snapshot) {
  const previousState = previous || {};

  if (
    Number.isFinite(previousState.acceptedVersion) &&
    previousState.acceptedVersion >= snapshot.scheduleVersion
  ) {
    return {
      scheduleVersion: snapshot.scheduleVersion,
      attempts: previousState.attempts || 0,
      status: "synced",
    };
  }

  return {
    scheduleVersion: snapshot.scheduleVersion,
    attempts: previousState.attempts || 0,
    status: "pending",
  };
}

