import {
  appendFocusSession,
  createNextRecurringTask,
  createTaskFromInput,
  loadAppState,
  serializeAppState,
  updateTaskOrganization,
} from "./extension-bridge.js";
import { groupTasksByDate } from "../extensions/calendar.js";
import {
  finishFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  startFocusSession,
} from "../extensions/focus-timer.js";
import { queryTasks, sortTasks } from "../extensions/query-engine.js";
import { matchShortcut } from "../extensions/shortcuts.js";
import {
  addSubtask,
  calculateProgress,
  removeSubtask,
  toggleSubtask,
} from "../extensions/subtasks.js";
import { moveTask, reorderTasks } from "../extensions/manual-order.js";
import { resolveTheme, getNextThemePreference } from "../extensions/theme.js";
import { getViewCounts, getViewTasks } from "../extensions/views.js";

const extensionEngine = {
  addSubtask,
  appendFocusSession,
  calculateProgress,
  createNextRecurringTask,
  createTaskFromInput,
  getNextThemePreference,
  getViewCounts,
  getViewTasks,
  groupTasksByDate,
  loadState: loadAppState,
  matchShortcut,
  moveTask,
  queryTasks,
  removeSubtask,
  reorderTasks,
  resolveTheme,
  serializeState: serializeAppState,
  sortTasks,
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  finishFocusSession,
  toggleSubtask,
  updateTaskOrganization,
};

window.TodoApp.initApp({
  documentRef: document,
  windowRef: window,
  extensionEngine,
});
