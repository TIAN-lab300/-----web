# 阶段 B 合并计划

**Goal:** 在阶段 A 基础上接入搜索、排序、核心任务视图和深色模式，并强制创建任务时填写名称、截止时间和优先级。

**Architecture:** 使用现有 `src/extensions/query-engine.js`、`views.js` 和 `theme.js`。`extensionEngine` 增加查询、视图和主题适配。界面只新增控制栏，不改变任务主数据结构。

**Tech Stack:** HTML、CSS、原生 JavaScript、ES Modules、Node test、Playwright。

## Constraints

- 创建任务必须填写名称、截止时间和非 `none` 优先级。
- 分类、标签和备注仍然可选。
- 不接入子任务、重复提醒、日历和专注计时器 UI。
- 搜索、排序和视图只操作现有任务数据。

## Tasks

- [x] 更新桥接层，强制创建约束。
- [x] 增加搜索、排序和视图控制。
- [x] 接入查询和视图模块。
- [x] 接入深色模式并持久化偏好。
- [x] 更新现有单元和浏览器测试。
- [x] 运行全部验证。
