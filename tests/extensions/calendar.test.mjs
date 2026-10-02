import test from "node:test";
import assert from "node:assert/strict";

import { groupTasksByDate } from "../../src/extensions/calendar.js";

test("groupTasksByDate groups tasks by local date inside the range", () => {
  const groups = groupTasksByDate(
    [
      {
        id: "task-1",
        title: "任务一",
        dueAt: "2026-10-02T18:00:00+08:00",
      },
      {
        id: "task-2",
        title: "任务二",
        startAt: "2026-10-03T09:00:00+08:00",
      },
      {
        id: "outside",
        title: "范围外",
        dueAt: "2026-10-09T18:00:00+08:00",
      },
    ],
    {
      start: "2026-10-02T00:00:00+08:00",
      end: "2026-10-04T00:00:00+08:00",
    },
  );

  assert.deepEqual(groups.get("2026-10-02").map((task) => task.id), ["task-1"]);
  assert.deepEqual(groups.get("2026-10-03").map((task) => task.id), ["task-2"]);
  assert.equal(groups.has("2026-10-09"), false);
});

