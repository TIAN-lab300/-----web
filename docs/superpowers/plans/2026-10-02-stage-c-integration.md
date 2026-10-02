# 阶段 C 合并计划

**Goal:** 将子任务与进度、手动排序与拖拽、键盘快捷键接入当前应用。

**Architecture:** 复用 `src/extensions/subtasks.js`、`manual-order.js` 和 `shortcuts.js`，通过 `extensionEngine` 暴露给 `app.js`。子任务直接保存到任务对象，进度即时计算。

## Tasks

- [x] 扩展桥接层暴露子任务、排序和快捷键函数。
- [x] 在任务项中渲染子任务列表和进度。
- [x] 支持新增、完成、删除子任务。
- [x] 在手动排序模式支持拖拽和上移下移。
- [x] 支持 Alt+N 新建、斜杠搜索、Alt+T 切换主题。
- [x] 更新浏览器测试并运行全部验证。
