# 待办应用扩展模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 独立实现待办扩展功能的纯逻辑模块，并用 Node 内置测试逐项验证，不修改或接入当前运行中的应用。

**Architecture:** 所有扩展模块位于 `src/extensions`，使用 ES Modules。模块只包含数据和算法，不访问 DOM、`localStorage`、网络或通知 API。测试位于 `tests/extensions`，依赖注入时间和外部服务。

**Tech Stack:** Node.js 16+、ES Modules、`node:test`、`assert/strict`。

**Spec:** `docs/superpowers/specs/2026-09-30-personal-todo-local-mvp-design.md`

## Global Constraints

- 不修改 `index.html`、`styles.css`、`app.js`。
- 不把新模块接入当前页面或当前测试。
- 不引入第三方运行时依赖。
- 所有新增代码放在 `src/extensions`。
- 所有新增测试放在 `tests/extensions`。
- 时间计算必须接收显式 `now` 或时钟函数。
- 外部推送使用注入的适配器，不在模块中直接发送网络请求。

---

### Task 1: 扩展任务模型和迁移

**Files:**
- Create: `src/extensions/task-schema.js`
- Create: `src/extensions/migrations.js`
- Test: `tests/extensions/task-schema.test.mjs`
- Test: `tests/extensions/migrations.test.mjs`

**Interfaces:**

- `createExtendedTask(input, options) -> Task | null`
- `normalizePriority(value) -> Priority`
- `createDefaultPreferences() -> Preferences`
- `migrateState(state) -> MigrationResult`

- [x] 写失败测试，覆盖默认字段、非法优先级、版本 2 到版本 5 的迁移。
- [x] 运行 `node tests/extensions/task-schema.test.mjs`，确认因模块不存在失败。
- [x] 实现最小任务模型和迁移函数。
- [x] 运行测试并确认通过。

### Task 2: 分类、标签、优先级和备注

**Files:**
- Create: `src/extensions/organization.js`
- Test: `tests/extensions/organization.test.mjs`

**Interfaces:**

- `createCategory(input, options) -> Category | null`
- `createTag(input, options) -> Tag | null`
- `assignCategory(task, categoryId) -> Task`
- `toggleTaskTag(task, tagId) -> Task`
- `deleteCategory(categories, tasks, categoryId, replacementId) -> Result`
- `deleteTag(tags, tasks, tagId) -> Result`

- [x] 写失败测试，覆盖默认分类、标签去重、删除关联和备注更新。
- [x] 运行 `node tests/extensions/organization.test.mjs`，确认失败。
- [x] 实现最小逻辑。
- [x] 运行测试并确认通过。

### Task 3: 子任务、进度和手动排序

**Files:**
- Create: `src/extensions/subtasks.js`
- Create: `src/extensions/manual-order.js`
- Test: `tests/extensions/subtasks.test.mjs`
- Test: `tests/extensions/manual-order.test.mjs`

**Interfaces:**

- `addSubtask(task, input, options) -> Task`
- `updateSubtask(task, subtaskId, updates, now) -> Task`
- `toggleSubtask(task, subtaskId) -> Task`
- `removeSubtask(task, subtaskId) -> Task`
- `calculateProgress(task) -> Progress`
- `reorderTasks(tasks, taskId, targetIndex) -> Task[]`
- `moveTask(tasks, taskId, direction) -> Task[]`

- [x] 写失败测试，覆盖子任务 CRUD、进度、拖拽替换和上移下移。
- [x] 运行对应测试，确认失败。
- [x] 实现最小逻辑。
- [x] 运行测试并确认通过。

### Task 4: 搜索、筛选、排序和视图

**Files:**
- Create: `src/extensions/query-engine.js`
- Create: `src/extensions/views.js`
- Test: `tests/extensions/query-engine.test.mjs`
- Test: `tests/extensions/views.test.mjs`

**Interfaces:**

- `queryTasks(tasks, query, context) -> Task[]`
- `sortTasks(tasks, sortBy, direction) -> Task[]`
- `getViewTasks(tasks, viewId, context) -> Task[]`
- `getViewCounts(tasks, context) -> Record<string, number>`

- [x] 写失败测试，覆盖标题/备注/标签搜索、组合过滤、优先级排序、今日/逾期/即将到期视图。
- [x] 运行测试，确认失败。
- [x] 实现查询流水线和视图函数。
- [x] 运行测试并确认通过。

### Task 5: 重复规则、提醒和日历分组

**Files:**
- Create: `src/extensions/recurrence.js`
- Create: `src/extensions/reminders.js`
- Create: `src/extensions/calendar.js`
- Test: `tests/extensions/recurrence.test.mjs`
- Test: `tests/extensions/reminders.test.mjs`
- Test: `tests/extensions/calendar.test.mjs`

**Interfaces:**

- `getNextOccurrence(rule, fromDate, options) -> string | null`
- `createReminder(input, options) -> Reminder | null`
- `getReminderFireAt(task, reminder, occurrenceAt) -> string | null`
- `getDueReminderJobs(reminders, now, options) -> ReminderJob[]`
- `createReminderDedupeKey(reminderId, fireAt) -> string`
- `groupTasksByDate(tasks, range, context) -> Map<string, Task[]>`

- [x] 写失败测试，覆盖一次性、每天、每周多日、跨月、提醒去重和日历分组。
- [x] 运行测试，确认失败。
- [x] 实现时间算法。
- [x] 运行测试并确认通过。

### Task 6: 主题、快捷键和专注计时器

**Files:**
- Create: `src/extensions/theme.js`
- Create: `src/extensions/shortcuts.js`
- Create: `src/extensions/focus-timer.js`
- Test: `tests/extensions/theme.test.mjs`
- Test: `tests/extensions/shortcuts.test.mjs`
- Test: `tests/extensions/focus-timer.test.mjs`

**Interfaces:**

- `resolveTheme(preference, systemPrefersDark) -> "light" | "dark"`
- `getNextThemePreference(preference) -> Preference`
- `matchShortcut(eventLike, shortcuts) -> string | null`
- `startFocusSession(timer, taskId, now) -> TimerState`
- `pauseFocusSession(timer, now) -> TimerState`
- `resumeFocusSession(timer, now) -> TimerState`
- `finishFocusSession(timer, now) -> SessionResult`

- [x] 写失败测试，覆盖主题解析、输入框快捷键保护、暂停计时和跨刷新恢复。
- [x] 运行测试，确认失败。
- [x] 实现最小逻辑。
- [x] 运行测试并确认通过。

### Task 7: 提醒同步、调度和推送适配

**Files:**
- Create: `src/extensions/reminder-sync.js`
- Create: `src/extensions/reminder-scheduler.js`
- Create: `src/extensions/push-adapter.js`
- Test: `tests/extensions/reminder-sync.test.mjs`
- Test: `tests/extensions/reminder-scheduler.test.mjs`
- Test: `tests/extensions/push-adapter.test.mjs`

**Interfaces:**

- `buildReminderSchedule(tasks, context) -> ScheduleSnapshot`
- `createSyncQueueEntry(previous, snapshot) -> SyncQueueEntry`
- `selectDueJobs(schedules, now) -> Job[]`
- `markJobResult(job, result, options) -> Job`
- `createPushAdapter(pushService) -> PushAdapter`

- [x] 写失败测试，覆盖计划构建、版本冲突、到期选择、重试和过期订阅。
- [x] 运行测试，确认失败。
- [x] 实现纯逻辑和注入式推送适配器。
- [x] 运行测试并确认通过。

### Task 8: 独立验证

- [x] 逐个运行 `tests/extensions/*.test.mjs`。
- [x] 运行统一的扩展测试入口。
- [x] 确认现有 `tests/app.test.cjs` 仍然通过。
- [x] 检查 `index.html`、`styles.css`、`app.js` 没有被修改。
- [x] 输出独立模块和测试结果。
