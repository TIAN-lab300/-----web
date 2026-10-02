const DEFAULT_RETRY_DELAYS = [60000, 300000, 900000];

export function selectDueJobs(jobs, now) {
  const nowTime = Date.parse(now);

  if (!Number.isFinite(nowTime)) {
    return [];
  }

  return (jobs || [])
    .filter((job) => {
      if (job.status === "scheduled") {
        return Date.parse(job.fireAt) <= nowTime;
      }

      if (job.status === "retry_wait") {
        return Date.parse(job.nextAttemptAt) <= nowTime;
      }

      return false;
    })
    .sort((first, second) => Date.parse(first.fireAt) - Date.parse(second.fireAt));
}

export function markJobResult(job, result, options = {}) {
  const now = options.now;

  if (result?.ok) {
    return {
      ...job,
      status: "sent",
      sentAt: now,
      nextAttemptAt: null,
    };
  }

  if (!result?.retryable) {
    return {
      ...job,
      status: "failed",
      failedAt: now,
      nextAttemptAt: null,
    };
  }

  const retryDelays = options.retryDelaysMs || DEFAULT_RETRY_DELAYS;
  const retryCount = (job.retryCount || 0) + 1;
  const delay =
    retryDelays[Math.min(retryCount - 1, retryDelays.length - 1)] ||
    DEFAULT_RETRY_DELAYS[DEFAULT_RETRY_DELAYS.length - 1];

  return {
    ...job,
    status: "retry_wait",
    retryCount,
    nextAttemptAt: new Date(Date.parse(now) + delay).toISOString(),
  };
}

