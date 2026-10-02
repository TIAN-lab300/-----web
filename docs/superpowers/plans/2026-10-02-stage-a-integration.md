# 阶段 A 合并计划

**Goal:** 把独立扩展模块接入当前应用，完成版本迁移、优先级、分类、标签和备注。

**Architecture:** 保留 `src/extensions` 独立模块。新增 `src/app/extension-bridge.js` 作为应用与扩展模块之间的适配层。`app.js` 保持现有核心逻辑，通过可选 `extensionEngine` 使用扩展模型和迁移。

**Tech Stack:** HTML、CSS、原生 JavaScript、ES Modules、Node test、Playwright。

## Constraints

- 不复制扩展模块源码到 `app.js`。
- 不删除现有测试。
- 不一次接入搜索、视图、日历、计时器和后台推送 UI。
- 扩展模块缺失时，现有 MVP 行为仍然可用。

## Tasks

- [x] 新增扩展桥接层和测试。
- [x] 让存储层支持版本 5 数据。
- [x] 让创建和编辑任务使用扩展任务模型。
- [x] 在页面中加入优先级、分类、标签和备注输入。
- [x] 在任务项中显示优先级、分类、标签和备注状态。
- [x] 扩展浏览器测试。
- [x] 运行现有和扩展全部测试。
