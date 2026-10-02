import test from "node:test";
import assert from "node:assert/strict";

import {
  finishFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  startFocusSession,
} from "../../src/extensions/focus-timer.mjs";

test("focus timer tracks running, paused and resumed time", () => {
  const started = startFocusSession(null, "task-1", "2026-10-02T10:00:00.000Z");
  const paused = pauseFocusSession(started, "2026-10-02T10:10:00.000Z");
  const resumed = resumeFocusSession(paused, "2026-10-02T10:20:00.000Z");
  const finished = finishFocusSession(resumed, "2026-10-02T10:30:00.000Z");

  assert.equal(paused.status, "paused");
  assert.equal(paused.accumulatedMs, 10 * 60 * 1000);
  assert.equal(resumed.status, "running");
  assert.equal(finished.session.durationSeconds, 20 * 60);
  assert.equal(finished.timer.status, "idle");
});

test("pausing an idle timer returns the original state", () => {
  const idle = { status: "idle", taskId: null, accumulatedMs: 0 };

  assert.equal(pauseFocusSession(idle, "2026-10-02T10:00:00.000Z"), idle);
});

