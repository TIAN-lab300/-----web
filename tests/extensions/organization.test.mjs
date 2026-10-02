import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CATEGORIES,
  DEFAULT_TAGS,
  assignCategory,
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  toggleTaskTag,
  updateTaskNotes,
} from "../../src/extensions/organization.js";

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "任务",
    completed: false,
    createdAt: "2026-10-02T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
    dueAt: null,
    categoryId: null,
    tagIds: [],
    priority: "none",
    notes: "",
    ...overrides,
  };
}

test("default categories and tags cover life and study organization", () => {
  assert.equal(DEFAULT_CATEGORIES.some((category) => category.name === "生活"), true);
  assert.equal(DEFAULT_CATEGORIES.some((category) => category.name === "学习"), true);
  assert.equal(DEFAULT_TAGS.some((tag) => tag.name === "吃饭"), true);
  assert.equal(DEFAULT_TAGS.some((tag) => tag.name === "健身"), true);
  assert.equal(DEFAULT_TAGS.some((tag) => tag.name === "阅读"), true);
});

test("createCategory trims and rejects duplicates case-insensitively", () => {
  const category = createCategory(
    { name: "  生活  " },
    { id: "category-life", now: "2026-10-02T10:00:00.000Z" },
  );

  assert.equal(category.name, "生活");
  assert.equal(
    createCategory(
      { name: "生活" },
      {
        id: "category-other",
        now: "2026-10-02T10:00:00.000Z",
        existingCategories: [category],
      },
    ),
    null,
  );
});

test("createTag trims and rejects duplicate names", () => {
  const tag = createTag(
    { name: "健身" },
    { id: "tag-fitness", now: "2026-10-02T10:00:00.000Z" },
  );

  assert.equal(tag.name, "健身");
  assert.equal(
    createTag(
      { name: "健身" },
      {
        id: "tag-other",
        now: "2026-10-02T10:00:00.000Z",
        existingTags: [tag],
      },
    ),
    null,
  );
});

test("assignCategory and toggleTaskTag return new task objects", () => {
  const task = makeTask();
  const categorized = assignCategory(task, "category-life");
  const tagged = toggleTaskTag(categorized, "tag-fitness");
  const untagged = toggleTaskTag(tagged, "tag-fitness");

  assert.equal(task.categoryId, null);
  assert.equal(categorized.categoryId, "category-life");
  assert.deepEqual(tagged.tagIds, ["tag-fitness"]);
  assert.deepEqual(untagged.tagIds, []);
  assert.notEqual(categorized, task);
});

test("updateTaskNotes preserves multiline text and updates timestamp", () => {
  const updated = updateTaskNotes(
    makeTask(),
    "第一行\n第二行",
    "2026-10-02T11:00:00.000Z",
  );

  assert.equal(updated.notes, "第一行\n第二行");
  assert.equal(updated.updatedAt, "2026-10-02T11:00:00.000Z");
});

test("deleteCategory reassigns or clears task category", () => {
  const result = deleteCategory(
    [{ id: "category-old", name: "旧分类" }],
    [makeTask({ categoryId: "category-old" })],
    "category-old",
    null,
  );

  assert.deepEqual(result.categories, []);
  assert.equal(result.tasks[0].categoryId, null);
});

test("deleteTag removes tag references from all tasks", () => {
  const result = deleteTag(
    [{ id: "tag-fitness", name: "健身" }],
    [makeTask({ tagIds: ["tag-fitness", "tag-reading"] })],
    "tag-fitness",
  );

  assert.deepEqual(result.tags, []);
  assert.deepEqual(result.tasks[0].tagIds, ["tag-reading"]);
});
