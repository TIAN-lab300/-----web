import test from "node:test";
import assert from "node:assert/strict";

import {
  markJobResult,
  selectDueJobs,
} from "../../src/extensions/reminder-scheduler.mjs";

function makeJob(overrides = {}) {
  return {
    id: "job-1",
    fireAt: "2026-10-02T10:00:00.000Z",
    status: "scheduled",
    scheduledFor: "2026-10-02T10:00:00.000Z",
    retryCount: 0,
    nextAttemptAt: null,
    ...overrides,
  };
}

test("selectDueJobs returns scheduled jobs whose time has arrived", () => {
  const jobs = [
    makeJob({ id: "due" }),
    makeJob({ id: "future", fireAt: "2026-10-02T11:00:00.000Z" }),
    makeJob({ id: "sent", status: "sent" }),
  ];
  const result = selectDueJobs(jobs, "2026-10-02T10:30:00.000Z");

  assert.deepEqual(result.map((job) => job.id), ["due"]);
});

test("markJobResult marks successful jobs as sent", () => {
  const result = markJobResult(
    makeJob(),
    { ok: true },
    { now: "2026-10-02T10:00:01.000Z" },
  );

  assert.equal(result.status, "sent");
  assert.equal(result.sentAt, "2026-10-02T10:00:01.000Z");
});

test("markJobResult schedules retryable failures with backoff", () => {
  const result = markJobResult(
    makeJob(),
    { ok: false, retryable: true },
    {
      now: "2026-10-02T10:00:00.000Z",
      retryDelaysMs: [60000, 300000],
    },
  );

  assert.equal(result.status, "retry_wait");
  assert.equal(result.retryCount, 1);
  assert.equal(result.nextAttemptAt, "2026-10-02T10:01:00.000Z");
});

test("markJobResult fails permanent errors", () => {
  const result = markJobResult(
    makeJob(),
    { ok: false, retryable: false },
    { now: "2026-10-02T10:00:00.000Z" },
  );

  assert.equal(result.status, "failed");
});

