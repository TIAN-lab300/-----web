import test from "node:test";
import assert from "node:assert/strict";

import { matchShortcut } from "../../src/extensions/shortcuts.mjs";

const shortcuts = [
  { id: "new-task", key: "n", ctrl: true },
  { id: "search", key: "/", ignoreWhenTyping: false },
  { id: "complete", key: "Enter" },
];

test("matchShortcut matches modifier keys and key name", () => {
  assert.equal(
    matchShortcut(
      { key: "n", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
      shortcuts,
    ),
    "new-task",
  );
});

test("matchShortcut ignores global shortcuts while typing", () => {
  assert.equal(
    matchShortcut(
      {
        key: "n",
        ctrlKey: true,
        target: { tagName: "INPUT", isContentEditable: false },
      },
      shortcuts,
    ),
    null,
  );
});

test("matchShortcut allows explicit typing-safe shortcuts", () => {
  assert.equal(
    matchShortcut(
      {
        key: "/",
        target: { tagName: "INPUT", isContentEditable: false },
      },
      shortcuts,
    ),
    "search",
  );
});

