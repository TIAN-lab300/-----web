(function attachTodoApp(root, factory) {
  const app = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = app;
  }

  if (typeof window !== "undefined") {
    window.TodoApp = app;
  }

  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    window.TODO_APP_DEFER_BOOTSTRAP !== true
  ) {
    const start = function startTodoApp() {
      app.initApp({
        documentRef: document,
        windowRef: window,
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createTodoApp() {
  "use strict";

  const FILTERS = Object.freeze({
    ALL: "all",
    ACTIVE: "active",
    COMPLETED: "completed",
  });
  const STORAGE_KEY = "personal-todo.mvp.v1";
  const LEGACY_STORAGE_VERSION = 1;
  const STORAGE_VERSION = 2;
  const PRIORITY_OPTIONS = [
    { value: "none", label: "无" },
    { value: "low", label: "低" },
    { value: "medium", label: "中" },
    { value: "high", label: "高" },
    { value: "urgent", label: "紧急" },
  ];
  const GLOBAL_SHORTCUTS = [
    { id: "new-task", key: "n", alt: true, ignoreWhenTyping: false },
    { id: "search", key: "/", ignoreWhenTyping: true },
    { id: "toggle-theme", key: "t", alt: true, ignoreWhenTyping: false },
  ];

  function normalizeTitle(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim();
  }

  function normalizeDueAt(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return undefined;
    }

    return parsedDate.toISOString();
  }

  function createTask(title, options) {
    const normalizedTitle = normalizeTitle(title);
    const settings = options || {};
    const dueAt = normalizeDueAt(settings.dueAt);

    if (!normalizedTitle || !settings.id || !settings.now || dueAt === undefined) {
      return null;
    }

    return {
      id: settings.id,
      title: normalizedTitle,
      completed: false,
      createdAt: settings.now,
      updatedAt: settings.now,
      dueAt,
    };
  }

  function updateTask(tasks, taskId, updates, now) {
    const settings = updates || {};
    const normalizedTitle = normalizeTitle(settings.title);
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    const hasDueAt = Object.prototype.hasOwnProperty.call(settings, "dueAt");
    const dueAt = hasDueAt ? normalizeDueAt(settings.dueAt) : null;

    if (!normalizedTitle || taskIndex === -1 || (hasDueAt && dueAt === undefined)) {
      return tasks;
    }

    return tasks.map((task, index) => {
      if (index !== taskIndex) {
        return task;
      }

      return {
        ...task,
        title: normalizedTitle,
        ...(hasDueAt ? { dueAt } : {}),
        updatedAt: now,
      };
    });
  }

  function updateTaskTitle(tasks, taskId, title, now) {
    return updateTask(tasks, taskId, { title }, now);
  }

  function toggleTaskCompletion(tasks, taskId, now) {
    const taskIndex = tasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1) {
      return tasks;
    }

    return tasks.map((task, index) => {
      if (index !== taskIndex) {
        return task;
      }

      return {
        ...task,
        completed: !task.completed,
        updatedAt: now,
      };
    });
  }

  function removeTask(tasks, taskId) {
    if (!tasks.some((task) => task.id === taskId)) {
      return tasks;
    }

    return tasks.filter((task) => task.id !== taskId);
  }

  function sortTasks(tasks) {
    return [...tasks].sort((first, second) => {
      const firstTime = Date.parse(first.createdAt);
      const secondTime = Date.parse(second.createdAt);

      if (firstTime !== secondTime) {
        return secondTime - firstTime;
      }

      return first.id.localeCompare(second.id);
    });
  }

  function filterTasks(tasks, filter) {
    const sortedTasks = sortTasks(tasks);

    if (filter === FILTERS.ACTIVE) {
      return sortedTasks.filter((task) => !task.completed);
    }

    if (filter === FILTERS.COMPLETED) {
      return sortedTasks.filter((task) => task.completed);
    }

    return sortedTasks;
  }

  function countRemainingTasks(tasks) {
    return tasks.filter((task) => !task.completed).length;
  }

  function isTaskOverdue(task, now) {
    if (!task || task.completed || !task.dueAt) {
      return false;
    }

    const dueTime = Date.parse(task.dueAt);
    const currentTime = Date.parse(now);

    return !Number.isNaN(dueTime) && !Number.isNaN(currentTime) && dueTime < currentTime;
  }

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function toDateTimeLocalValue(dueAt) {
    if (!dueAt) {
      return "";
    }

    const date = new Date(dueAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return [
      date.getFullYear(),
      "-",
      padDatePart(date.getMonth() + 1),
      "-",
      padDatePart(date.getDate()),
      "T",
      padDatePart(date.getHours()),
      ":",
      padDatePart(date.getMinutes()),
    ].join("");
  }

  function formatDueAt(dueAt) {
    if (!dueAt) {
      return "";
    }

    const date = new Date(dueAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function isValidTask(task, requireDueAt) {
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      return false;
    }

    const hasValidDueAt =
      !requireDueAt ||
      task.dueAt === null ||
      (typeof task.dueAt === "string" && !Number.isNaN(Date.parse(task.dueAt)));

    return (
      typeof task.id === "string" &&
      task.id.trim() !== "" &&
      typeof task.title === "string" &&
      task.title.trim() !== "" &&
      typeof task.completed === "boolean" &&
      typeof task.createdAt === "string" &&
      !Number.isNaN(Date.parse(task.createdAt)) &&
      typeof task.updatedAt === "string" &&
      !Number.isNaN(Date.parse(task.updatedAt)) &&
      hasValidDueAt
    );
  }

  function parseStoredState(serializedState) {
    if (serializedState === null || serializedState === undefined) {
      return {
        ok: true,
        tasks: [],
      };
    }

    let parsedState;

    try {
      parsedState = JSON.parse(serializedState);
    } catch (error) {
      return {
        ok: false,
        error: "本地数据无法解析。",
      };
    }

    if (!parsedState || typeof parsedState !== "object" || Array.isArray(parsedState)) {
      return {
        ok: false,
        error: "本地数据结构无效。",
      };
    }

    if (
      parsedState.version !== LEGACY_STORAGE_VERSION &&
      parsedState.version !== STORAGE_VERSION
    ) {
      return {
        ok: false,
        error: "本地数据版本不受支持。",
      };
    }

    if (!Array.isArray(parsedState.tasks)) {
      return {
        ok: false,
        error: "本地任务列表无效。",
      };
    }

    const identifiers = new Set();
    const requiresDueAt = parsedState.version === STORAGE_VERSION;
    const migratedTasks = [];

    for (const task of parsedState.tasks) {
      if (!isValidTask(task, requiresDueAt) || identifiers.has(task.id)) {
        return {
          ok: false,
          error: "本地任务数据无效。",
        };
      }

      identifiers.add(task.id);
      migratedTasks.push(
        requiresDueAt
          ? task
          : {
              ...task,
              dueAt: null,
            },
      );
    }

    return {
      ok: true,
      tasks: migratedTasks,
    };
  }

  function createStorageAdapter(storage, extensionEngine) {
    return {
      load() {
        if (!storage) {
          return {
            tasks: [],
            storageAvailable: false,
            notice: "当前浏览器无法保存数据，任务只保留到本次会话结束。",
          };
        }

        try {
          const serializedState = storage.getItem(STORAGE_KEY);

          if (extensionEngine && typeof extensionEngine.loadState === "function") {
            const result = extensionEngine.loadState(serializedState);

            if (!result.ok) {
              return {
                tasks: [],
                state: null,
                storageAvailable: true,
                notice: result.error || "本地数据无法读取。",
              };
            }

            return {
              tasks: result.state.tasks,
              state: result.state,
              storageAvailable: true,
              notice: null,
            };
          }

          const result = parseStoredState(serializedState);

          if (!result.ok) {
            return {
              tasks: [],
              storageAvailable: true,
              notice: result.error,
            };
          }

          return {
            tasks: result.tasks,
            state: null,
            storageAvailable: true,
            notice: null,
          };
        } catch (error) {
          return {
            tasks: [],
            state: null,
            storageAvailable: false,
            notice: "当前浏览器无法读取本地数据，任务只保留到本次会话结束。",
          };
        }
      },

      save(tasks) {
        if (!storage) {
          return {
            ok: false,
            notice: "当前浏览器无法保存数据，任务只保留到本次会话结束。",
          };
        }

        try {
          storage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              version: STORAGE_VERSION,
              tasks,
            }),
          );

          return {
            ok: true,
            notice: null,
          };
        } catch (error) {
          return {
            ok: false,
            notice: "数据无法永久保存，任务只保留到本次会话结束。",
          };
        }
      },

      saveState(state) {
        if (!storage) {
          return {
            ok: false,
            notice: "当前浏览器无法保存数据，任务只保留到本次会话结束。",
          };
        }

        try {
          const serializedState =
            extensionEngine && typeof extensionEngine.serializeState === "function"
              ? extensionEngine.serializeState({
                  ...state,
                  version: 5,
                })
              : JSON.stringify({
                  version: STORAGE_VERSION,
                  tasks: Array.isArray(state) ? state : state.tasks,
                });

          storage.setItem(STORAGE_KEY, serializedState);

          return {
            ok: true,
            notice: null,
          };
        } catch (error) {
          return {
            ok: false,
            notice: "数据无法永久保存，任务只保留到本次会话结束。",
          };
        }
      },
    };
  }

  function generateTaskId(existingIds, cryptoApi, timeSource) {
    const identifiers = existingIds instanceof Set ? existingIds : new Set(existingIds || []);
    let baseId;

    if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
      try {
        baseId = cryptoApi.randomUUID();
      } catch (error) {
        baseId = "";
      }
    }

    if (!baseId) {
      const timestamp = typeof timeSource === "function" ? timeSource() : Date.now();
      baseId = `task-${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
    }

    let candidate = baseId;
    let suffix = 2;

    while (identifiers.has(candidate)) {
      candidate = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  function getEmptyStateMessage(totalTaskCount, filter) {
    if (totalTaskCount === 0) {
      return "还没有任务，先添加一项吧。";
    }

    if (filter === FILTERS.ACTIVE) {
      return "没有未完成任务。";
    }

    if (filter === FILTERS.COMPLETED) {
      return "还没有已完成任务。";
    }

    return "当前筛选下没有任务。";
  }

  function getElements(documentRef) {
    const elements = {
      addTaskForm: documentRef.getElementById("add-task-form"),
      addTaskButton: documentRef.getElementById("add-task-button"),
      taskInput: documentRef.getElementById("task-input"),
      dueAtInput: documentRef.getElementById("due-at-input"),
      categoryInput: documentRef.getElementById("category-input"),
      priorityInput: documentRef.getElementById("priority-input"),
      repeatInput: documentRef.getElementById("repeat-input"),
      weekdayInput: documentRef.getElementById("weekday-input"),
      tagInput: documentRef.getElementById("tag-input"),
      notesInput: documentRef.getElementById("notes-input"),
      inputError: documentRef.getElementById("input-error"),
      searchForm: documentRef.getElementById("search-form"),
      searchInput: documentRef.getElementById("search-input"),
      sortSelect: documentRef.getElementById("sort-select"),
      sortDirectionButton: documentRef.getElementById("sort-direction-button"),
      themeToggleButton: documentRef.getElementById("theme-toggle-button"),
      focusPanel: documentRef.getElementById("focus-panel"),
      focusTaskTitle: documentRef.getElementById("focus-task-title"),
      focusElapsed: documentRef.getElementById("focus-elapsed"),
      focusToggleButton: documentRef.getElementById("focus-toggle-button"),
      focusFinishButton: documentRef.getElementById("focus-finish-button"),
      filterBar: documentRef.querySelector(".filter-bar"),
      taskList: documentRef.getElementById("task-list"),
      emptyState: documentRef.getElementById("empty-state"),
      remainingCount: documentRef.getElementById("remaining-count"),
      storageNotice: documentRef.getElementById("storage-notice"),
    };

    const missingElement = Object.entries(elements).find((entry) => !entry[1]);

    if (missingElement) {
      throw new Error(`Missing required element: ${missingElement[0]}`);
    }

    return elements;
  }

  function renderInputError(elements, message) {
    elements.inputError.hidden = !message;
    elements.inputError.textContent = message || "";
  }

  function renderStorageNotice(elements, message) {
    elements.storageNotice.hidden = !message;
    elements.storageNotice.textContent = message || "";
  }

  function renderSummary(elements, tasks) {
    elements.remainingCount.textContent = `还有 ${countRemainingTasks(tasks)} 项未完成`;
  }

  function renderFilters(elements, filter) {
    const filterButtons = elements.filterBar.querySelectorAll("[data-view]");

    filterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.view === filter));
    });
  }

  function createActionButton(documentRef, action, label, className) {
    const button = documentRef.createElement("button");
    button.type = action === "save" ? "submit" : "button";
    button.dataset.action = action;
    button.className = className;
    button.textContent = label;
    return button;
  }

  function createNamedSelect(
    documentRef,
    labelText,
    options,
    selectedValue,
    dataRole,
    multiple,
  ) {
    const label = documentRef.createElement("label");
    label.className = "edit-extension-field";

    const fieldLabel = documentRef.createElement("span");
    fieldLabel.className = "field-label";
    fieldLabel.textContent = labelText;

    const select = documentRef.createElement("select");
    select.className = "extension-select";
    select.dataset.role = dataRole;
    select.multiple = Boolean(multiple);

    if (multiple) {
      select.size = Math.min(5, Math.max(2, options.length));
    }

    options.forEach((optionValue) => {
      const option = documentRef.createElement("option");
      option.value = optionValue.value;
      option.textContent = optionValue.label;
      option.selected = multiple
        ? selectedValue.includes(optionValue.value)
        : selectedValue === optionValue.value;
      select.append(option);
    });

    label.append(fieldLabel, select);
    return label;
  }

  function createOrganizationEditor(documentRef, task, context) {
    if (!context.extensionEngine) {
      return [];
    }

    const categories = context.appState.categories || [];
    const tags = context.appState.tags || [];
    const categoryOptions = [
      { value: "", label: "未分类" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ];
    const tagOptions = tags.map((tag) => ({
      value: tag.id,
      label: tag.name,
    }));

    const notesLabel = documentRef.createElement("label");
    notesLabel.className = "edit-extension-field notes-field";
    const notesTitle = documentRef.createElement("span");
    notesTitle.className = "field-label";
    notesTitle.textContent = "备注";
    const notes = documentRef.createElement("textarea");
    notes.className = "extension-notes";
    notes.dataset.role = "edit-notes";
    notes.rows = 3;
    notes.value = task.notes || "";
    notesLabel.append(notesTitle, notes);

    return [
      createNamedSelect(
        documentRef,
        "分类",
        categoryOptions,
        task.categoryId || "",
        "edit-category",
        false,
      ),
      createNamedSelect(
        documentRef,
        "优先级",
        PRIORITY_OPTIONS,
        task.priority || "none",
        "edit-priority",
        false,
      ),
      createNamedSelect(
        documentRef,
        "标签",
        tagOptions,
        task.tagIds || [],
        "edit-tags",
        true,
      ),
      notesLabel,
    ];
  }

  function createRecurrenceEditor(documentRef, task) {
    const repeatLabel = documentRef.createElement("label");
    repeatLabel.className = "edit-extension-field";
    const repeatTitle = documentRef.createElement("span");
    repeatTitle.className = "field-label";
    repeatTitle.textContent = "重复";
    const repeatSelect = documentRef.createElement("select");
    repeatSelect.className = "extension-select";
    repeatSelect.dataset.role = "edit-repeat";
    [
      ["once", "一次"],
      ["daily", "每天"],
      ["weekly", "每周"],
    ].forEach(([value, label]) => {
      const option = documentRef.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = (task.recurrence?.mode || "once") === value;
      repeatSelect.append(option);
    });
    repeatLabel.append(repeatTitle, repeatSelect);

    const weekdayField = documentRef.createElement("fieldset");
    weekdayField.className = "weekday-field";
    weekdayField.dataset.role = "edit-weekdays";
    weekdayField.hidden = task.recurrence?.mode !== "weekly";
    const legend = documentRef.createElement("legend");
    legend.textContent = "重复星期";
    weekdayField.append(legend);

    [
      [1, "周一"],
      [2, "周二"],
      [3, "周三"],
      [4, "周四"],
      [5, "周五"],
      [6, "周六"],
      [0, "周日"],
    ].forEach(([value, label]) => {
      const optionLabel = documentRef.createElement("label");
      const checkbox = documentRef.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = String(value);
      checkbox.checked = (task.recurrence?.weekdays || []).includes(value);
      optionLabel.append(checkbox, documentRef.createTextNode(label));
      weekdayField.append(optionLabel);
    });

    return [repeatLabel, weekdayField];
  }

  function createTaskMetadata(documentRef, task, context) {
    if (!context.extensionEngine) {
      return null;
    }

    const metadata = documentRef.createElement("div");
    metadata.className = "task-metadata";

    const priorityLabel = PRIORITY_OPTIONS.find(
      (option) => option.value === task.priority,
    );

    if (task.priority && task.priority !== "none" && priorityLabel) {
      const badge = documentRef.createElement("span");
      badge.className = `task-badge priority-${task.priority}`;
      badge.textContent = priorityLabel.label;
      metadata.append(badge);
    }

    if (task.recurrence?.mode && task.recurrence.mode !== "once") {
      const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
      const badge = documentRef.createElement("span");
      badge.className = "task-badge recurrence-badge";
      badge.textContent =
        task.recurrence.mode === "daily"
          ? "每天"
          : `每周${(task.recurrence.weekdays || [])
              .map((day) => weekdays[day])
              .join("、")}`;
      metadata.append(badge);
    }

    const category = (context.appState.categories || []).find(
      (item) => item.id === task.categoryId,
    );

    if (category) {
      const badge = documentRef.createElement("span");
      badge.className = "task-badge category-badge";
      badge.textContent = category.name;
      metadata.append(badge);
    }

    const tags = (context.appState.tags || []).filter((tag) =>
      (task.tagIds || []).includes(tag.id),
    );

    tags.forEach((tag) => {
      const badge = documentRef.createElement("span");
      badge.className = "task-badge tag-badge";
      badge.textContent = tag.name;
      metadata.append(badge);
    });

    if (task.notes) {
      const notes = documentRef.createElement("p");
      notes.className = "task-notes";
      notes.textContent = task.notes;
      metadata.append(notes);
    }

    return metadata.children.length > 0 ? metadata : null;
  }

  function createSubtaskSection(documentRef, task, context) {
    if (!context.extensionEngine) {
      return null;
    }

    const progress = context.extensionEngine.calculateProgress(task);
    const details = documentRef.createElement("details");
    details.className = "subtask-section";
    details.dataset.taskId = task.id;
    details.open = context.appState.openSubtaskTaskIds.has(task.id);

    const summary = documentRef.createElement("summary");
    const summaryText = documentRef.createElement("span");
    summaryText.textContent = "子任务";
    const progressText = documentRef.createElement("span");
    progressText.className = "subtask-progress";
    progressText.dataset.role = "subtask-progress";
    progressText.textContent = `${progress.completed}/${progress.total}`;
    summary.append(summaryText, progressText);

    const list = documentRef.createElement("div");
    list.className = "subtask-list";

    [...(task.subtasks || [])]
      .sort((first, second) => first.order - second.order)
      .forEach((subtask) => {
        const row = documentRef.createElement("div");
        row.className = "subtask-row";
        row.dataset.role = "subtask-row";
        row.dataset.subtaskId = subtask.id;

        const checkboxLabel = documentRef.createElement("label");
        checkboxLabel.className = "subtask-checkbox";
        const checkbox = documentRef.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = subtask.completed;
        checkbox.dataset.role = "subtask-checkbox";
        checkbox.setAttribute("aria-label", `切换子任务“${subtask.title}”`);
        checkboxLabel.append(checkbox);

        const title = documentRef.createElement("span");
        title.className = "subtask-title";
        title.textContent = subtask.title;

        const removeButton = createActionButton(
          documentRef,
          "delete-subtask",
          "删除",
          "text-button danger-text-button",
        );
        removeButton.setAttribute("aria-label", `删除子任务“${subtask.title}”`);

        row.append(checkboxLabel, title, removeButton);
        list.append(row);
      });

    const form = documentRef.createElement("form");
    form.className = "subtask-form";
    form.dataset.role = "subtask-form";
    form.dataset.taskId = task.id;
    const titleInput = documentRef.createElement("input");
    titleInput.type = "text";
    titleInput.placeholder = "添加子任务";
    titleInput.dataset.role = "subtask-title";
    titleInput.setAttribute("aria-label", "添加子任务");
    const addButton = documentRef.createElement("button");
    addButton.type = "submit";
    addButton.className = "toolbar-button";
    addButton.dataset.action = "add-subtask";
    addButton.textContent = "添加";
    form.append(titleInput, addButton);

    details.append(summary, list, form);
    return details;
  }

  function createTaskElement(
    documentRef,
    task,
    isEditing,
    editError,
    now,
    context,
  ) {
    const item = documentRef.createElement("li");
    item.className = "task-item";
    item.dataset.taskId = task.id;
    item.classList.toggle("is-completed", task.completed);
    item.classList.toggle("is-editing", isEditing);
    item.classList.toggle("is-overdue", isTaskOverdue(task, now));
    const canReorder =
      Boolean(context.extensionEngine) &&
      context.appState.sortBy === "manual" &&
      context.appState.view === "all" &&
      !context.appState.searchText;
    item.draggable = canReorder;

    const checkboxLabel = documentRef.createElement("label");
    checkboxLabel.className = "task-checkbox";

    const checkbox = documentRef.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute(
      "aria-label",
      task.completed ? `将“${task.title}”标记为未完成` : `将“${task.title}”标记为已完成`,
    );
    checkboxLabel.append(checkbox);

    if (isEditing) {
      const editForm = documentRef.createElement("form");
      editForm.className = "edit-form";
      editForm.dataset.role = "edit-form";
      editForm.dataset.taskId = task.id;

      const editInput = documentRef.createElement("input");
      editInput.type = "text";
      editInput.className = "edit-input";
      editInput.dataset.role = "edit-input";
      editInput.value = task.title;
      editInput.setAttribute("aria-label", "编辑任务内容");

      const dueField = documentRef.createElement("label");
      dueField.className = "edit-due-field";

      const dueFieldLabel = documentRef.createElement("span");
      dueFieldLabel.className = "field-label";
      dueFieldLabel.textContent = "截止时间";

      const editDueAt = documentRef.createElement("input");
      editDueAt.type = "datetime-local";
      editDueAt.className = "edit-input";
      editDueAt.dataset.role = "edit-due-at";
      editDueAt.value = toDateTimeLocalValue(task.dueAt);
      editDueAt.setAttribute("aria-label", "编辑截止时间");

      dueField.append(dueFieldLabel, editDueAt);

      const editFields = documentRef.createElement("div");
      editFields.className = "edit-fields";
      editFields.append(
        editInput,
        dueField,
        ...createRecurrenceEditor(documentRef, task),
        ...createOrganizationEditor(documentRef, task, context),
      );

      const editActions = documentRef.createElement("div");
      editActions.className = "task-actions";
      editActions.append(
        createActionButton(documentRef, "save", "保存", "text-button primary-text-button"),
        createActionButton(documentRef, "cancel", "取消", "text-button"),
      );

      const editErrorElement = documentRef.createElement("p");
      editErrorElement.className = "inline-error";
      editErrorElement.dataset.role = "edit-error";
      editErrorElement.hidden = !editError;
      editErrorElement.textContent = editError || "";
      editErrorElement.setAttribute("role", "alert");

      editForm.append(editFields, editActions, editErrorElement);
      item.append(checkboxLabel, editForm);
      return item;
    }

    const content = documentRef.createElement("div");
    content.className = "task-content";

    const title = documentRef.createElement("span");
    title.className = "task-title";
    title.dataset.role = "task-title";
    title.textContent = task.title;
    content.append(title);

    if (task.dueAt) {
      const deadline = documentRef.createElement("p");
      const overdue = isTaskOverdue(task, now);
      deadline.className = "task-deadline";
      deadline.classList.toggle("is-overdue", overdue);
      deadline.textContent = `${overdue ? "已逾期 · " : ""}截止 ${formatDueAt(task.dueAt)}`;
      content.append(deadline);
    }

    const metadata = createTaskMetadata(documentRef, task, context);

    if (metadata) {
      content.append(metadata);
    }

    const subtaskSection = createSubtaskSection(documentRef, task, context);

    if (subtaskSection) {
      content.append(subtaskSection);
    }

    const actions = documentRef.createElement("div");
    actions.className = "task-actions";

    if (canReorder) {
      actions.append(
        createActionButton(
          documentRef,
          "move-up",
          "上移",
          "text-button",
        ),
        createActionButton(
          documentRef,
          "move-down",
          "下移",
          "text-button",
        ),
      );
    }

    if (context.extensionEngine) {
      actions.append(
        createActionButton(documentRef, "focus", "专注", "text-button"),
      );
    }

    actions.append(
      createActionButton(documentRef, "edit", "编辑", "text-button"),
      createActionButton(documentRef, "delete", "删除", "text-button danger-text-button"),
    );

    item.append(checkboxLabel, content, actions);
    return item;
  }

  function getExtendedEmptyStateMessage(appState) {
    if (appState.tasks.length === 0) {
      return "还没有任务，先添加一项吧。";
    }

    if (appState.searchText) {
      return "没有匹配的搜索结果。";
    }

    const viewMessages = {
      today: "今天没有任务。",
      upcoming: "没有即将到期的任务。",
      completed: "还没有已完成任务。",
      overdue: "没有已逾期的任务。",
      calendar: "本月没有带时间的任务。",
    };

    return viewMessages[appState.view] || "当前条件下没有任务。";
  }

  function renderCalendarTaskList(context, visibleTasks, now) {
    const { documentRef, elements } = context;
    const current = new Date(now);
    const range = {
      start: new Date(current.getFullYear(), current.getMonth(), 1).toISOString(),
      end: new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1,
      ).toISOString(),
    };
    const groups = context.extensionEngine.groupTasksByDate(
      visibleTasks,
      range,
    );
    const groupElements = [];

    [...groups.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .forEach(([dateKey, tasks]) => {
        const day = documentRef.createElement("li");
        day.className = "calendar-day";
        day.dataset.role = "calendar-day";
        const heading = documentRef.createElement("h3");
        heading.textContent = dateKey;
        const list = documentRef.createElement("ul");
        list.className = "calendar-task-list";

        tasks.forEach((task) => {
          const taskElement = createTaskElement(
            documentRef,
            task,
            context.appState.editingTaskId === task.id,
            context.appState.editingTaskId === task.id
              ? context.appState.editError
              : "",
            now,
            context,
          );
          taskElement.dataset.role = "calendar-task";
          list.append(taskElement);
        });

        day.append(heading, list);
        groupElements.push(day);
      });

    elements.taskList.replaceChildren(...groupElements);
    elements.emptyState.hidden = groupElements.length !== 0;
    elements.emptyState.textContent = getExtendedEmptyStateMessage(
      context.appState,
    );
  }

  function renderTaskList(context) {
    const { documentRef, elements, appState } = context;
    const now = context.now();
    let visibleTasks;

    if (context.extensionEngine) {
      const viewTasks = context.extensionEngine.getViewTasks(
        appState.tasks,
        appState.view,
        {
          now,
          upcomingDays: 7,
        },
      );
      const searchedTasks = context.extensionEngine.queryTasks(
        viewTasks,
        {
          text: appState.searchText,
        },
        {
          now,
          categories: appState.categories,
          tags: appState.tags,
        },
      );
      visibleTasks = context.extensionEngine.sortTasks(
        searchedTasks,
        appState.sortBy,
        appState.sortDirection,
      );
    } else {
      visibleTasks = filterTasks(appState.tasks, appState.filter);
    }

    if (context.extensionEngine && appState.view === "calendar") {
      renderCalendarTaskList(context, visibleTasks, now);
      return;
    }

    const taskElements = visibleTasks.map((task) =>
      createTaskElement(
        documentRef,
        task,
        appState.editingTaskId === task.id,
        appState.editingTaskId === task.id ? appState.editError : "",
        now,
        context,
      ),
    );

    elements.taskList.replaceChildren(...taskElements);
    elements.emptyState.hidden = visibleTasks.length !== 0;
    elements.emptyState.textContent = context.extensionEngine
      ? getExtendedEmptyStateMessage(appState)
      : getEmptyStateMessage(appState.tasks.length, appState.filter);
  }

  function getFocusElapsedMs(timer, now) {
    const running =
      timer.status === "running" && timer.resumedAt
        ? Date.parse(now) - Date.parse(timer.resumedAt)
        : 0;

    return Math.max(0, timer.accumulatedMs + running);
  }

  function formatElapsed(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ];

    if (hours > 0) {
      parts.unshift(String(hours).padStart(2, "0"));
    }

    return parts.join(":");
  }

  function renderFocusPanel(context) {
    const { elements, appState, extensionEngine, windowRef } = context;

    if (!extensionEngine || appState.focusTimer.status === "idle") {
      elements.focusPanel.hidden = true;
      elements.focusTaskTitle.textContent = "";
      elements.focusElapsed.textContent = "00:00";

      if (appState.focusIntervalId) {
        windowRef.clearInterval(appState.focusIntervalId);
        appState.focusIntervalId = null;
      }

      return;
    }

    const task = appState.tasks.find(
      (item) => item.id === appState.focusTimer.taskId,
    );
    elements.focusPanel.hidden = false;
    elements.focusTaskTitle.textContent = task ? task.title : "任务已删除";
    elements.focusElapsed.textContent = formatElapsed(
      getFocusElapsedMs(appState.focusTimer, context.now()),
    );
    elements.focusToggleButton.textContent =
      appState.focusTimer.status === "running" ? "暂停" : "继续";

    if (appState.focusTimer.status === "running" && !appState.focusIntervalId) {
      appState.focusIntervalId = windowRef.setInterval(() => {
        renderFocusPanel(context);
      }, 1000);
    }

    if (appState.focusTimer.status !== "running" && appState.focusIntervalId) {
      windowRef.clearInterval(appState.focusIntervalId);
      appState.focusIntervalId = null;
    }
  }

  function renderToolbar(context) {
    const { elements, appState, extensionEngine, windowRef } = context;
    if (context.documentRef.activeElement !== elements.searchInput) {
      elements.searchInput.value = appState.searchDraft;
    }
    elements.sortSelect.value = appState.sortBy;
    elements.sortDirectionButton.textContent =
      appState.sortDirection === "desc" ? "降序" : "升序";

    const themeLabels = {
      system: "自动",
      light: "浅色",
      dark: "深色",
    };
    elements.themeToggleButton.textContent = `主题：${
      themeLabels[appState.themePreference] || "自动"
    }`;

    if (extensionEngine) {
      const systemPrefersDark =
        typeof windowRef.matchMedia === "function" &&
        windowRef.matchMedia("(prefers-color-scheme: dark)").matches;
      context.documentRef.documentElement.dataset.theme =
        extensionEngine.resolveTheme(
          appState.themePreference,
          systemPrefersDark,
        );
    }
  }

  function renderApp(context) {
    const { elements, appState } = context;
    renderTaskList(context);
    renderSummary(elements, appState.tasks);
    renderStorageNotice(elements, appState.storageNotice);
    renderFilters(elements, appState.view);
    renderInputError(elements, appState.inputError);
    renderToolbar(context);
    renderFocusPanel(context);
  }

  function focusEditInput(context, taskId) {
    const editInput = context.elements.taskList.querySelector(
      `[data-task-id="${taskId}"] [data-role="edit-input"]`,
    );

    if (editInput) {
      editInput.focus();
      editInput.select();
    }
  }

  function saveAndRender(context) {
    const saveResult = context.extensionEngine
      ? context.storageAdapter.saveState({
          version: 5,
          tasks: context.appState.tasks,
          categories: context.appState.categories,
          tags: context.appState.tags,
          preferences: context.appState.preferences,
        })
      : context.storageAdapter.save(context.appState.tasks);

    if (!saveResult.ok) {
      context.appState.storageAvailable = false;
      context.appState.storageNotice = saveResult.notice;
    } else if (context.appState.storageAvailable) {
      context.appState.storageNotice = null;
    }

    renderApp(context);
  }

  function readRecurrence(modeElement, weekdayElement, timeZone) {
    const mode = modeElement ? modeElement.value : "once";
    const weekdays = weekdayElement
      ? Array.from(weekdayElement.querySelectorAll('input[type="checkbox"]'))
          .filter((checkbox) => checkbox.checked)
          .map((checkbox) => Number(checkbox.value))
      : [];

    return {
      mode,
      weekdays: mode === "weekly" ? weekdays : [],
      timeZone:
        timeZone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "UTC",
    };
  }

  function handleAddTaskSubmit(event, context) {
    event.preventDefault();

    const title = normalizeTitle(context.elements.taskInput.value);
    const rawDueAt = context.elements.dueAtInput.value;
    const dueAt = normalizeDueAt(context.elements.dueAtInput.value);

    if (!title) {
      context.appState.inputError = "请输入任务内容。";
      renderInputError(context.elements, context.appState.inputError);
      context.elements.taskInput.focus();
      return;
    }

    if (context.extensionEngine && !rawDueAt) {
      context.appState.inputError = "请选择截止时间。";
      renderInputError(context.elements, context.appState.inputError);
      context.elements.dueAtInput.focus();
      return;
    }

    if (dueAt === undefined) {
      context.appState.inputError = "截止时间格式无效。";
      renderInputError(context.elements, context.appState.inputError);
      context.elements.dueAtInput.focus();
      return;
    }

    if (
      context.extensionEngine &&
      (!context.elements.priorityInput.value ||
        context.elements.priorityInput.value === "none")
    ) {
      context.appState.inputError = "请选择优先级。";
      renderInputError(context.elements, context.appState.inputError);
      context.elements.priorityInput.focus();
      return;
    }

    const id = generateTaskId(
      new Set(context.appState.tasks.map((task) => task.id)),
      context.cryptoApi,
    );
    const task = context.extensionEngine
      ? context.extensionEngine.createTaskFromInput(
          {
            title,
            dueAt,
            categoryId: context.elements.categoryInput.value || null,
            priority: context.elements.priorityInput.value,
            tagIds: Array.from(context.elements.tagInput.selectedOptions).map(
              (option) => option.value,
            ),
            notes: context.elements.notesInput.value,
            recurrence: readRecurrence(
              context.elements.repeatInput,
              context.elements.weekdayInput,
            ),
          },
          {
            id,
            now: context.now(),
            manualOrder: context.appState.tasks.length,
          },
        )
      : createTask(title, {
          id,
          now: context.now(),
          dueAt,
        });

    if (!task) {
      return;
    }

    context.appState.tasks = [...context.appState.tasks, task];
    context.appState.inputError = "";
    context.appState.editingTaskId = null;
    context.appState.editError = "";
    context.elements.taskInput.value = "";
    context.elements.dueAtInput.value = "";
    context.elements.categoryInput.value = "";
    context.elements.priorityInput.value = "";
    context.elements.repeatInput.value = "once";
    context.elements.weekdayInput.hidden = true;
    context.elements.weekdayInput
      .querySelectorAll('input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });
    context.elements.tagInput.selectedIndex = -1;
    context.elements.notesInput.value = "";
    saveAndRender(context);
    context.elements.taskInput.focus();
  }

  function handleTaskToggle(event, context) {
    const editRepeat = event.target.closest('[data-role="edit-repeat"]');

    if (editRepeat) {
      const form = editRepeat.closest('[data-role="edit-form"]');
      const weekdays = form?.querySelector('[data-role="edit-weekdays"]');

      if (weekdays) {
        weekdays.hidden = editRepeat.value !== "weekly";
      }

      return;
    }

    const checkbox = event.target.closest('input[type="checkbox"]');

    if (!checkbox) {
      return;
    }

    const item = checkbox.closest("[data-task-id]");

    if (!item) {
      return;
    }

    if (checkbox.dataset.role === "subtask-checkbox") {
      const subtaskRow = checkbox.closest("[data-subtask-id]");

      if (!subtaskRow) {
        return;
      }

      context.appState.tasks = context.appState.tasks.map((task) =>
        task.id === item.dataset.taskId
          ? context.extensionEngine.toggleSubtask(
              task,
              subtaskRow.dataset.subtaskId,
            )
          : task,
      );
      saveAndRender(context);
      return;
    }

    const taskId = item.dataset.taskId;
    const previousTask = context.appState.tasks.find((task) => task.id === taskId);
    let updatedTasks = toggleTaskCompletion(
      context.appState.tasks,
      taskId,
      context.now(),
    );
    const updatedTask = updatedTasks.find((task) => task.id === taskId);

    if (
      context.extensionEngine &&
      previousTask &&
      !previousTask.completed &&
      updatedTask?.completed &&
      updatedTask.recurrence?.mode !== "once"
    ) {
      const nextTask = context.extensionEngine.createNextRecurringTask(
        updatedTask,
        {
          id: generateTaskId(
            new Set(updatedTasks.map((task) => task.id)),
            context.cryptoApi,
          ),
          now: context.now(),
          manualOrder: updatedTasks.length,
        },
      );
      const duplicateExists =
        nextTask &&
        updatedTasks.some(
          (task) =>
            task.seriesId === nextTask.seriesId &&
            task.dueAt === nextTask.dueAt,
        );

      if (nextTask && !duplicateExists) {
        updatedTasks = [...updatedTasks, nextTask];
      }
    }

    context.appState.tasks = updatedTasks;

    if (context.appState.editingTaskId === item.dataset.taskId) {
      context.appState.editingTaskId = null;
      context.appState.editError = "";
    }

    saveAndRender(context);
  }

  function handleTaskListClick(event, context) {
    const button = event.target.closest("[data-action]");

    if (!button || !context.elements.taskList.contains(button)) {
      return;
    }

    const item = button.closest("[data-task-id]");

    if (!item) {
      return;
    }

    const taskId = item.dataset.taskId;
    const action = button.dataset.action;

    if (action === "delete-subtask") {
      const subtaskRow = button.closest("[data-subtask-id]");

      if (!subtaskRow) {
        return;
      }

      context.appState.tasks = context.appState.tasks.map((task) =>
        task.id === taskId
          ? context.extensionEngine.removeSubtask(
              task,
              subtaskRow.dataset.subtaskId,
            )
          : task,
      );
      saveAndRender(context);
      return;
    }

    if (action === "move-up" || action === "move-down") {
      context.appState.tasks = context.extensionEngine.moveTask(
        context.appState.tasks,
        taskId,
        action === "move-up" ? "up" : "down",
      );
      saveAndRender(context);
      return;
    }

    if (action === "focus") {
      context.appState.focusTimer = context.extensionEngine.startFocusSession(
        context.appState.focusTimer,
        taskId,
        context.now(),
      );
      renderFocusPanel(context);
      return;
    }

    if (action === "edit") {
      context.appState.editingTaskId = taskId;
      context.appState.editError = "";
      renderApp(context);
      focusEditInput(context, taskId);
      return;
    }

    if (action === "cancel") {
      context.appState.editingTaskId = null;
      context.appState.editError = "";
      renderApp(context);
      return;
    }

    if (action === "delete") {
      const shouldDelete = context.windowRef.confirm("确定删除这项任务吗？");

      if (!shouldDelete) {
        return;
      }

      context.appState.tasks = removeTask(context.appState.tasks, taskId);
      context.appState.editingTaskId = null;
      context.appState.editError = "";
      saveAndRender(context);
    }
  }

  function handleEditSubmit(event, context) {
    const form = event.target.closest('[data-role="edit-form"]');

    if (!form) {
      return;
    }

    event.preventDefault();

    const taskId = form.dataset.taskId;
    const editInput = form.querySelector('[data-role="edit-input"]');
    const editDueAt = form.querySelector('[data-role="edit-due-at"]');
    const title = normalizeTitle(editInput ? editInput.value : "");
    const dueAt = normalizeDueAt(editDueAt ? editDueAt.value : "");

    if (!title || dueAt === undefined) {
      const errorElement = form.querySelector('[data-role="edit-error"]');

      if (errorElement) {
        errorElement.hidden = false;
        errorElement.textContent = !title ? "任务内容不能为空。" : "截止时间格式无效。";
      }

      if (!title && editInput) {
        editInput.focus();
      } else if (editDueAt) {
        editDueAt.focus();
      }

      return;
    }

    const updatedTasks = updateTask(
      context.appState.tasks,
      taskId,
      {
        title,
        dueAt,
      },
      context.now(),
    );
    const editCategory = form.querySelector('[data-role="edit-category"]');
    const editPriority = form.querySelector('[data-role="edit-priority"]');
    const editRepeat = form.querySelector('[data-role="edit-repeat"]');
    const editWeekdays = form.querySelector('[data-role="edit-weekdays"]');
    const editTags = form.querySelector('[data-role="edit-tags"]');
    const editNotes = form.querySelector('[data-role="edit-notes"]');

    context.appState.tasks = context.extensionEngine
      ? updatedTasks.map((task) =>
          task.id === taskId
            ? context.extensionEngine.updateTaskOrganization(
                task,
                {
                  categoryId: editCategory?.value || null,
                  priority: editPriority?.value || "none",
                  recurrence: readRecurrence(
                    editRepeat,
                    editWeekdays,
                    context.appState.tasks.find((task) => task.id === taskId)
                      ?.recurrence?.timeZone,
                  ),
                  tagIds: editTags
                    ? Array.from(editTags.selectedOptions).map(
                        (option) => option.value,
                      )
                    : [],
                  notes: editNotes?.value || "",
                },
                context.now(),
              )
            : task,
        )
      : updatedTasks;
    context.appState.editingTaskId = null;
    context.appState.editError = "";
    saveAndRender(context);
  }

  function handleSubtaskSubmit(event, context) {
    const form = event.target.closest('[data-role="subtask-form"]');

    if (!form) {
      return;
    }

    event.preventDefault();
    const taskId = form.dataset.taskId;
    const input = form.querySelector('[data-role="subtask-title"]');
    const title = normalizeTitle(input ? input.value : "");

    if (!title) {
      return;
    }

    context.appState.tasks = context.appState.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      const existingIds = new Set(
        (task.subtasks || []).map((subtask) => subtask.id),
      );
      const id = generateTaskId(existingIds, context.cryptoApi);

      return context.extensionEngine.addSubtask(
        task,
        { title },
        {
          id,
          order: (task.subtasks || []).length,
          now: context.now(),
        },
      );
    });
    context.appState.openSubtaskTaskIds.add(taskId);
    saveAndRender(context);
  }

  function handleSubtaskToggle(event, context) {
    const details = event.target.closest(".subtask-section");

    if (!details) {
      return;
    }

    if (details.open) {
      context.appState.openSubtaskTaskIds.add(details.dataset.taskId);
    } else {
      context.appState.openSubtaskTaskIds.delete(details.dataset.taskId);
    }
  }

  function handleTaskDragStart(event, context) {
    const item = event.target.closest("[data-task-id]");

    if (!item || !item.draggable) {
      return;
    }

    context.appState.draggedTaskId = item.dataset.taskId;
    item.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.dataset.taskId);
    }
  }

  function handleTaskDragOver(event, context) {
    if (!context.appState.draggedTaskId) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleTaskDrop(event, context) {
    if (!context.appState.draggedTaskId) {
      return;
    }

    const targetItem = event.target.closest("[data-task-id]");

    if (!targetItem) {
      return;
    }

    event.preventDefault();
    const visibleTasks = context.extensionEngine.sortTasks(
      context.appState.tasks,
      "manual",
      "asc",
    );
    const targetIndex = visibleTasks.findIndex(
      (task) => task.id === targetItem.dataset.taskId,
    );

    if (targetIndex >= 0) {
      context.appState.tasks = context.extensionEngine.reorderTasks(
        context.appState.tasks,
        context.appState.draggedTaskId,
        targetIndex,
      );
      saveAndRender(context);
    }
  }

  function handleTaskDragEnd(event, context) {
    context.appState.draggedTaskId = null;
    event.target.closest("[data-task-id]")?.classList.remove("is-dragging");
  }

  function handleGlobalKeydown(event, context) {
    if (!context.extensionEngine) {
      return;
    }

    const shortcutId = context.extensionEngine.matchShortcut(
      event,
      GLOBAL_SHORTCUTS,
    );

    if (!shortcutId) {
      return;
    }

    event.preventDefault();

    if (shortcutId === "new-task") {
      context.elements.taskInput.focus();
      return;
    }

    if (shortcutId === "search") {
      context.elements.searchInput.focus();
      context.elements.searchInput.select();
      return;
    }

    if (shortcutId === "toggle-theme") {
      handleThemeToggle(event, context);
    }
  }

  function handleFocusToggle(context) {
    if (context.appState.focusTimer.status === "running") {
      context.appState.focusTimer = context.extensionEngine.pauseFocusSession(
        context.appState.focusTimer,
        context.now(),
      );
    } else if (context.appState.focusTimer.status === "paused") {
      context.appState.focusTimer = context.extensionEngine.resumeFocusSession(
        context.appState.focusTimer,
        context.now(),
      );
    }

    renderFocusPanel(context);
  }

  function handleFocusFinish(context) {
    if (context.appState.focusTimer.status === "idle") {
      return;
    }

    const now = context.now();
    const result = context.extensionEngine.finishFocusSession(
      context.appState.focusTimer,
      now,
    );

    if (result.session) {
      context.appState.tasks = context.appState.tasks.map((task) =>
        task.id === result.session.taskId
          ? context.extensionEngine.appendFocusSession(task, result.session, now)
          : task,
      );
    }

    context.appState.focusTimer = result.timer;
    saveAndRender(context);
  }

  function handleTaskListKeydown(event, context) {
    if (event.key !== "Escape" || !context.appState.editingTaskId) {
      return;
    }

    event.preventDefault();
    context.appState.editingTaskId = null;
    context.appState.editError = "";
    renderApp(context);
  }

  function handleFilterClick(event, context) {
    const button = event.target.closest("[data-view]");

    if (!button) {
      return;
    }

    const nextView = button.dataset.view;

    if (
      !["all", "today", "upcoming", "completed", "overdue", "calendar"].includes(
        nextView,
      )
    ) {
      return;
    }

    context.appState.view = nextView;
    context.appState.preferences.view = nextView;
    context.appState.filter =
      nextView === "completed"
        ? FILTERS.COMPLETED
        : nextView === "all"
          ? FILTERS.ALL
          : FILTERS.ACTIVE;
    context.appState.editingTaskId = null;
    context.appState.editError = "";
    saveAndRender(context);
  }

  function handleSearchInput(event, context) {
    context.appState.searchDraft = event.target.value;
  }

  function handleSearchSubmit(event, context) {
    event.preventDefault();
    context.appState.searchDraft = context.elements.searchInput.value;
    context.appState.searchText = context.appState.searchDraft.trim();
    renderApp(context);
  }

  function handleSortChange(event, context) {
    context.appState.sortBy = event.target.value;
    context.appState.preferences.sortBy = event.target.value;

    if (context.appState.sortBy === "manual") {
      context.appState.sortDirection = "asc";
      context.appState.preferences.sortDirection = "asc";
    }

    saveAndRender(context);
  }

  function handleSortDirectionClick(event, context) {
    context.appState.sortDirection =
      context.appState.sortDirection === "asc" ? "desc" : "asc";
    context.appState.preferences.sortDirection =
      context.appState.sortDirection;
    saveAndRender(context);
  }

  function handleThemeToggle(event, context) {
    context.appState.themePreference = context.extensionEngine
      ? context.extensionEngine.getNextThemePreference(
          context.appState.themePreference,
        )
      : "system";
    context.appState.preferences.theme = context.appState.themePreference;
    saveAndRender(context);
  }

  function initApp(options) {
    const settings = options || {};
    const documentRef =
      settings.documentRef || (typeof document !== "undefined" ? document : null);
    const windowRef = settings.windowRef || (typeof window !== "undefined" ? window : null);

    if (!documentRef || !windowRef) {
      throw new Error("initApp requires a browser document and window.");
    }

    let storage = settings.storage;

    if (storage === undefined) {
      try {
        storage = windowRef.localStorage;
      } catch (error) {
        storage = null;
      }
    }

    const extensionEngine = settings.extensionEngine || null;
    const storageAdapter = createStorageAdapter(storage, extensionEngine);
    const loadResult = storageAdapter.load();
    const preferences = loadResult.state?.preferences || {
      theme: "system",
      view: "all",
      sortBy: "createdAt",
      sortDirection: "desc",
    };
    const appState = {
      version: loadResult.state?.version || STORAGE_VERSION,
      tasks: loadResult.tasks,
      categories: loadResult.state?.categories || [],
      tags: loadResult.state?.tags || [],
      preferences,
      view: preferences.view || "all",
      searchDraft: "",
      searchText: "",
      sortBy: preferences.sortBy || "createdAt",
      sortDirection: preferences.sortDirection || "desc",
      themePreference: preferences.theme || "system",
      filter: FILTERS.ALL,
      editingTaskId: null,
      editError: "",
      draggedTaskId: null,
      focusTimer: {
        status: "idle",
        taskId: null,
        startedAt: null,
        resumedAt: null,
        accumulatedMs: 0,
      },
      focusIntervalId: null,
      openSubtaskTaskIds: new Set(),
      inputError: "",
      storageAvailable: loadResult.storageAvailable,
      storageNotice: loadResult.notice,
    };
    const elements = getElements(documentRef);
    const context = {
      documentRef,
      windowRef,
      elements,
      appState,
      storageAdapter,
      extensionEngine,
      cryptoApi: settings.cryptoApi || windowRef.crypto,
      now: settings.now || (() => new Date().toISOString()),
    };

    elements.addTaskForm.addEventListener("submit", (event) => {
      handleAddTaskSubmit(event, context);
    });
    elements.filterBar.addEventListener("click", (event) => {
      handleFilterClick(event, context);
    });
    elements.searchInput.addEventListener("input", (event) => {
      handleSearchInput(event, context);
    });
    elements.searchForm.addEventListener("submit", (event) => {
      handleSearchSubmit(event, context);
    });
    elements.sortSelect.addEventListener("change", (event) => {
      handleSortChange(event, context);
    });
    elements.sortDirectionButton.addEventListener("click", (event) => {
      handleSortDirectionClick(event, context);
    });
    elements.repeatInput.addEventListener("change", () => {
      elements.weekdayInput.hidden = elements.repeatInput.value !== "weekly";
    });
    elements.themeToggleButton.addEventListener("click", (event) => {
      handleThemeToggle(event, context);
    });
    elements.focusToggleButton.addEventListener("click", () => {
      handleFocusToggle(context);
    });
    elements.focusFinishButton.addEventListener("click", () => {
      handleFocusFinish(context);
    });
    elements.taskList.addEventListener("change", (event) => {
      handleTaskToggle(event, context);
    });
    elements.taskList.addEventListener("click", (event) => {
      handleTaskListClick(event, context);
    });
    elements.taskList.addEventListener("submit", (event) => {
      handleEditSubmit(event, context);
    });
    elements.taskList.addEventListener("submit", (event) => {
      handleSubtaskSubmit(event, context);
    });
    elements.taskList.addEventListener("keydown", (event) => {
      handleTaskListKeydown(event, context);
    });
    elements.taskList.addEventListener(
      "toggle",
      (event) => {
        handleSubtaskToggle(event, context);
      },
      true,
    );
    elements.taskList.addEventListener("dragstart", (event) => {
      handleTaskDragStart(event, context);
    });
    elements.taskList.addEventListener("dragover", (event) => {
      handleTaskDragOver(event, context);
    });
    elements.taskList.addEventListener("drop", (event) => {
      handleTaskDrop(event, context);
    });
    elements.taskList.addEventListener("dragend", (event) => {
      handleTaskDragEnd(event, context);
    });
    documentRef.addEventListener("keydown", (event) => {
      handleGlobalKeydown(event, context);
    });

    renderApp(context);
    return appState;
  }

  return {
    FILTERS,
    STORAGE_KEY,
    LEGACY_STORAGE_VERSION,
    STORAGE_VERSION,
    normalizeTitle,
    normalizeDueAt,
    createTask,
    updateTask,
    updateTaskTitle,
    toggleTaskCompletion,
    removeTask,
    sortTasks,
    filterTasks,
    countRemainingTasks,
    isTaskOverdue,
    toDateTimeLocalValue,
    formatDueAt,
    isValidTask,
    parseStoredState,
    createStorageAdapter,
    generateTaskId,
    getEmptyStateMessage,
    initApp,
  };
});
