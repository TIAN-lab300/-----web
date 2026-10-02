function createIdleTimer() {
  return {
    status: "idle",
    taskId: null,
    startedAt: null,
    resumedAt: null,
    accumulatedMs: 0,
  };
}

function getElapsed(timer, now) {
  const runningElapsed =
    timer.status === "running" && timer.resumedAt
      ? Date.parse(now) - Date.parse(timer.resumedAt)
      : 0;

  return Math.max(0, timer.accumulatedMs + runningElapsed);
}

export function startFocusSession(timer, taskId, now) {
  if (!taskId || Number.isNaN(Date.parse(now))) {
    return timer || createIdleTimer();
  }

  return {
    status: "running",
    taskId,
    startedAt: now,
    resumedAt: now,
    accumulatedMs: 0,
  };
}

export function pauseFocusSession(timer, now) {
  if (!timer || timer.status !== "running" || Number.isNaN(Date.parse(now))) {
    return timer;
  }

  return {
    ...timer,
    status: "paused",
    accumulatedMs: getElapsed(timer, now),
    resumedAt: null,
  };
}

export function resumeFocusSession(timer, now) {
  if (!timer || timer.status !== "paused" || Number.isNaN(Date.parse(now))) {
    return timer;
  }

  return {
    ...timer,
    status: "running",
    resumedAt: now,
  };
}

export function finishFocusSession(timer, now) {
  if (
    !timer ||
    !["running", "paused"].includes(timer.status) ||
    Number.isNaN(Date.parse(now))
  ) {
    return {
      timer: timer || createIdleTimer(),
      session: null,
    };
  }

  return {
    timer: createIdleTimer(),
    session: {
      taskId: timer.taskId,
      startedAt: timer.startedAt,
      endedAt: now,
      durationSeconds: Math.floor(getElapsed(timer, now) / 1000),
    },
  };
}

