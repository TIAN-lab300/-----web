export const DEFAULT_CATEGORIES = Object.freeze([
  { id: "category-life", name: "生活", color: "#3f7d5c" },
  { id: "category-study", name: "学习", color: "#4b6fa8" },
]);

export const DEFAULT_TAGS = Object.freeze([
  { id: "tag-eating", name: "吃饭", color: "#b06b3c" },
  { id: "tag-fitness", name: "健身", color: "#4f7f62" },
  { id: "tag-reading", name: "阅读", color: "#6f61a8" },
  { id: "tag-programming", name: "编程", color: "#407c8f" },
  { id: "tag-review", name: "复习", color: "#a06475" },
]);

function normalizeName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasDuplicateName(items, name) {
  const normalized = name.toLocaleLowerCase();
  return items.some(
    (item) =>
      typeof item?.name === "string" &&
      item.name.trim().toLocaleLowerCase() === normalized,
  );
}

export function createCategory(input = {}, options = {}) {
  const name = normalizeName(input.name);
  const existingCategories = Array.isArray(options.existingCategories)
    ? options.existingCategories
    : [];

  if (!name || !options.id || !options.now || hasDuplicateName(existingCategories, name)) {
    return null;
  }

  return {
    id: options.id,
    name,
    color: input.color || "#68736d",
    createdAt: options.now,
  };
}

export function createTag(input = {}, options = {}) {
  const name = normalizeName(input.name);
  const existingTags = Array.isArray(options.existingTags)
    ? options.existingTags
    : [];

  if (!name || !options.id || !options.now || hasDuplicateName(existingTags, name)) {
    return null;
  }

  return {
    id: options.id,
    name,
    color: input.color || "#68736d",
    createdAt: options.now,
  };
}

export function assignCategory(task, categoryId) {
  return {
    ...task,
    categoryId: categoryId || null,
  };
}

export function toggleTaskTag(task, tagId) {
  const tagIds = Array.isArray(task.tagIds) ? task.tagIds : [];
  const nextTagIds = tagIds.includes(tagId)
    ? tagIds.filter((id) => id !== tagId)
    : [...tagIds, tagId];

  return {
    ...task,
    tagIds: nextTagIds,
  };
}

export function updateTaskNotes(task, notes, now) {
  return {
    ...task,
    notes: typeof notes === "string" ? notes : "",
    updatedAt: now,
  };
}

export function deleteCategory(
  categories,
  tasks,
  categoryId,
  replacementCategoryId,
) {
  const replacementExists = categories.some(
    (category) => category.id === replacementCategoryId,
  );
  const nextCategoryId = replacementExists ? replacementCategoryId : null;

  return {
    categories: categories.filter((category) => category.id !== categoryId),
    tasks: tasks.map((task) =>
      task.categoryId === categoryId
        ? {
            ...task,
            categoryId: nextCategoryId,
          }
        : task,
    ),
  };
}

export function deleteTag(tags, tasks, tagId) {
  return {
    tags: tags.filter((tag) => tag.id !== tagId),
    tasks: tasks.map((task) => ({
      ...task,
      tagIds: Array.isArray(task.tagIds)
        ? task.tagIds.filter((id) => id !== tagId)
        : [],
    })),
  };
}

