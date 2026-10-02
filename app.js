(function attachTodoApp(root, factory) {
  const app = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = app;
  }

  if (typeof window !== "undefined") {
    window.TodoApp = app;
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
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

  function createStorageAdapter(storage) {
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
            storageAvailable: true,
            notice: null,
          };
        } catch (error) {
          return {
            tasks: [],
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
      inputError: documentRef.getElementById("input-error"),
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
    const filterButtons = elements.filterBar.querySelectorAll("[data-filter]");

    filterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
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

  function createTaskElement(documentRef, task, isEditing, editError, now) {
    const item = documentRef.createElement("li");
    item.className = "task-item";
    item.dataset.taskId = task.id;
    item.classList.toggle("is-completed", task.completed);
    item.classList.toggle("is-editing", isEditing);
    item.classList.toggle("is-overdue", isTaskOverdue(task, now));

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
      editFields.append(editInput, dueField);

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

    const actions = documentRef.createElement("div");
    actions.className = "task-actions";
    actions.append(
      createActionButton(documentRef, "edit", "编辑", "text-button"),
      createActionButton(documentRef, "delete", "删除", "text-button danger-text-button"),
    );

    item.append(checkboxLabel, content, actions);
    return item;
  }

  function renderTaskList(context) {
    const { documentRef, elements, appState } = context;
    const visibleTasks = filterTasks(appState.tasks, appState.filter);
    const now = context.now();
    const taskElements = visibleTasks.map((task) =>
      createTaskElement(
        documentRef,
        task,
        appState.editingTaskId === task.id,
        appState.editingTaskId === task.id ? appState.editError : "",
        now,
      ),
    );

    elements.taskList.replaceChildren(...taskElements);
    elements.emptyState.hidden = visibleTasks.length !== 0;
    elements.emptyState.textContent = getEmptyStateMessage(appState.tasks.length, appState.filter);
  }

  function renderApp(context) {
    const { elements, appState } = context;
    renderTaskList(context);
    renderSummary(elements, appState.tasks);
    renderStorageNotice(elements, appState.storageNotice);
    renderFilters(elements, appState.filter);
    renderInputError(elements, appState.inputError);
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
    const saveResult = context.storageAdapter.save(context.appState.tasks);

    if (!saveResult.ok) {
      context.appState.storageAvailable = false;
      context.appState.storageNotice = saveResult.notice;
    } else if (context.appState.storageAvailable) {
      context.appState.storageNotice = null;
    }

    renderApp(context);
  }

  function handleAddTaskSubmit(event, context) {
    event.preventDefault();

    const title = normalizeTitle(context.elements.taskInput.value);
    const dueAt = normalizeDueAt(context.elements.dueAtInput.value);

    if (!title) {
      context.appState.inputError = "请输入任务内容。";
      renderInputError(context.elements, context.appState.inputError);
      context.elements.taskInput.focus();
      return;
    }

    if (dueAt === undefined) {
      context.appState.inputError = "截止时间格式无效。";
      renderInputError(context.elements, context.appState.inputError);
      context.elements.dueAtInput.focus();
      return;
    }

    const id = generateTaskId(
      new Set(context.appState.tasks.map((task) => task.id)),
      context.cryptoApi,
    );
    const task = createTask(title, {
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
    saveAndRender(context);
    context.elements.taskInput.focus();
  }

  function handleTaskToggle(event, context) {
    const checkbox = event.target.closest('input[type="checkbox"]');

    if (!checkbox) {
      return;
    }

    const item = checkbox.closest("[data-task-id]");

    if (!item) {
      return;
    }

    context.appState.tasks = toggleTaskCompletion(
      context.appState.tasks,
      item.dataset.taskId,
      context.now(),
    );

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

    context.appState.tasks = updateTask(
      context.appState.tasks,
      taskId,
      {
        title,
        dueAt,
      },
      context.now(),
    );
    context.appState.editingTaskId = null;
    context.appState.editError = "";
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
    const button = event.target.closest("[data-filter]");

    if (!button) {
      return;
    }

    const nextFilter = button.dataset.filter;

    if (!Object.values(FILTERS).includes(nextFilter)) {
      return;
    }

    context.appState.filter = nextFilter;
    context.appState.editingTaskId = null;
    context.appState.editError = "";
    renderApp(context);
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

    const storageAdapter = createStorageAdapter(storage);
    const loadResult = storageAdapter.load();
    const appState = {
      tasks: loadResult.tasks,
      filter: FILTERS.ALL,
      editingTaskId: null,
      editError: "",
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
      cryptoApi: settings.cryptoApi || windowRef.crypto,
      now: settings.now || (() => new Date().toISOString()),
    };

    elements.addTaskForm.addEventListener("submit", (event) => {
      handleAddTaskSubmit(event, context);
    });
    elements.filterBar.addEventListener("click", (event) => {
      handleFilterClick(event, context);
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
    elements.taskList.addEventListener("keydown", (event) => {
      handleTaskListKeydown(event, context);
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
