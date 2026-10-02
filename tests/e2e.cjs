const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4173";
const storageKey = "personal-todo.mvp.v1";

function toLocalDateTimeInput(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}),
  });
  const page = await browser.newPage({
    viewport: {
      width: 1280,
      height: 900,
    },
  });

  let dialogDecision = "accept";

  page.on("dialog", async (dialog) => {
    if (dialogDecision === "dismiss") {
      await dialog.dismiss();
      return;
    }

    await dialog.accept();
  });

  try {
    await page.goto(baseUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const input = page.locator("#task-input");
    const listItems = page.locator("#task-list li");

    await input.fill("任务一");
    await page.locator(".advanced-fields summary").click();
    await page.locator("#category-input").selectOption("category-life");
    await page.locator("#priority-input").selectOption("high");
    await page.locator("#tag-input").selectOption("tag-fitness");
    await page.locator("#notes-input").fill("每周三次");
    await page
      .locator("#due-at-input")
      .fill(toLocalDateTimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    await input.press("Enter");
    assert.equal(await listItems.count(), 1);
    assert.equal(await input.inputValue(), "");
    assert.equal(await listItems.first().locator(".priority-high").textContent(), "高");
    assert.equal(await listItems.first().locator(".category-badge").textContent(), "生活");
    assert.equal(await listItems.first().locator(".tag-badge").textContent(), "健身");
    assert.equal(await listItems.first().locator(".task-notes").textContent(), "每周三次");
    assert.equal(await page.locator("#category-input").inputValue(), "");
    assert.equal(await page.locator("#priority-input").inputValue(), "");
    assert.equal(await page.locator("#notes-input").inputValue(), "");

    await input.fill("任务二");
    await page.locator("#priority-input").selectOption("medium");
    await page
      .locator("#due-at-input")
      .fill(toLocalDateTimeInput(new Date(Date.now() + 3 * 60 * 60 * 1000)));
    await page.locator("#add-task-button").click();
    assert.equal(await listItems.count(), 2);
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务二");

    const taskOne = page.locator("#task-list li").filter({ hasText: "任务一" });
    await taskOne.locator('input[type="checkbox"]').check();
    await page.locator('[data-view="completed"]').click();
    assert.equal(await listItems.count(), 1);
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务一");

    await page.locator('[data-view="all"]').click();
    const taskTwo = page.locator("#task-list li").filter({ hasText: "任务二" });
    const taskTwoId = await taskTwo.getAttribute("data-task-id");
    await taskTwo.locator('[data-action="edit"]').click();
    const editInput = page.locator(
      `#task-list li[data-task-id="${taskTwoId}"] [data-role="edit-input"]`,
    );
    await editInput.fill("任务二已更新");
    await page
      .locator(`#task-list li[data-task-id="${taskTwoId}"] [data-action="save"]`)
      .click();
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务二已更新");

    const search = page.locator("#search-input");
    await search.fill("每周三次");
    assert.equal(await listItems.count(), 2);
    await page.locator("#search-button").click();
    assert.equal(await listItems.count(), 1);
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务一");
    await search.fill("");
    await page.locator("#search-button").click();
    assert.equal(await listItems.count(), 2);

    await page.locator("#sort-select").selectOption("priority");
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务一");
    await page.locator("#sort-select").selectOption("createdAt");

    const lightThemeBackground = await page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    );
    await page.locator("#theme-toggle-button").click();
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      "light",
    );
    await page.locator("#theme-toggle-button").click();
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      "dark",
    );
    const darkThemeBackground = await page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    );
    assert.notEqual(darkThemeBackground, lightThemeBackground);

    const subtaskDetails = page.locator(
      `#task-list li[data-task-id="${taskTwoId}"] details.subtask-section`,
    );
    await subtaskDetails.locator("summary").click();
    await subtaskDetails.locator('[data-role="subtask-title"]').fill("热身");
    await subtaskDetails.locator('[data-role="subtask-form"] button[type="submit"]').click();
    assert.equal(await subtaskDetails.locator('[data-role="subtask-row"]').count(), 1);
    assert.equal(await subtaskDetails.locator('[data-role="subtask-progress"]').textContent(), "0/1");
    await subtaskDetails.locator('[data-role="subtask-checkbox"]').check();
    assert.equal(await subtaskDetails.locator('[data-role="subtask-progress"]').textContent(), "1/1");
    await subtaskDetails.locator('[data-action="delete-subtask"]').click();
    assert.equal(await subtaskDetails.locator('[data-role="subtask-row"]').count(), 0);

    await page.locator("#sort-select").selectOption("manual");
    const orderBeforeMove = await listItems.evaluateAll((items) =>
      items.map((item) => item.dataset.taskId),
    );
    await listItems
      .first()
      .locator('[data-action="move-down"]')
      .click();
    assert.equal(
      await listItems.first().getAttribute("data-task-id"),
      orderBeforeMove[1],
    );

    await page.keyboard.press("/");
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "search-input",
    );
    await page.keyboard.press("Alt+N");
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "task-input",
    );

    await page.locator('[data-view="calendar"]').click();
    assert.equal(await page.locator('[data-role="calendar-day"]').count() >= 1, true);
    assert.equal(
      await page.locator('[data-role="calendar-task"]').count() >= 2,
      true,
    );
    await page.locator('[data-view="all"]').click();

    await page
      .locator(`#task-list li[data-task-id="${taskTwoId}"] [data-action="focus"]`)
      .click();
    assert.equal(await page.locator("#focus-panel").isVisible(), true);
    assert.match(await page.locator("#focus-task-title").textContent(), /任务二/);
    await page.locator("#focus-toggle-button").click();
    assert.equal(await page.locator("#focus-toggle-button").textContent(), "继续");
    await page.locator("#focus-toggle-button").click();
    assert.equal(await page.locator("#focus-toggle-button").textContent(), "暂停");
    await page.locator("#focus-finish-button").click();
    assert.equal(await page.locator("#focus-panel").isVisible(), false);
    const focusState = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    const focusedTask = focusState.tasks.find((task) => task.id === taskTwoId);
    assert.equal(focusedTask.focusSessions.length, 1);

    await input.fill("每日任务");
    await page.locator("#due-at-input").fill("2026-10-05T09:00");
    const advancedFields = page.locator(".advanced-fields");
    if (!(await advancedFields.evaluate((element) => element.open))) {
      await advancedFields.locator("summary").click();
    }
    await page.locator("#priority-input").selectOption("medium");
    await page.locator("#repeat-input").selectOption("daily");
    await page.locator("#add-task-button").click();
    const recurringTask = page.locator("#task-list li").filter({ hasText: "每日任务" });
    assert.equal(await recurringTask.locator(".recurrence-badge").textContent(), "每天");
    const countBeforeRecurring = await listItems.count();
    await recurringTask.locator('input[type="checkbox"]').first().check();
    assert.equal(await listItems.count(), countBeforeRecurring + 1);
    assert.equal(
      await page.locator("#task-list li").filter({ hasText: "每日任务" }).count(),
      2,
    );
    while (
      (await page.locator("#task-list li").filter({ hasText: "每日任务" }).count()) >
      0
    ) {
      await page
        .locator("#task-list li")
        .filter({ hasText: "每日任务" })
        .first()
        .locator('[data-action="delete"]')
        .click();
    }

    await listItems.first().locator('[data-action="edit"]').click();
    const updatedTaskId = await listItems.first().getAttribute("data-task-id");
    await page
      .locator(`#task-list li[data-task-id="${updatedTaskId}"] [data-role="edit-input"]`)
      .fill("不应保存");
    await page
      .locator(`#task-list li[data-task-id="${updatedTaskId}"] [data-action="cancel"]`)
      .click();
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务二已更新");

    await listItems.first().locator('[data-action="edit"]').click();
    await page
      .locator(`#task-list li[data-task-id="${updatedTaskId}"] [data-role="edit-input"]`)
      .fill("   ");
    await page
      .locator(`#task-list li[data-task-id="${updatedTaskId}"] [data-action="save"]`)
      .click();
    assert.equal(
      await page
        .locator(`#task-list li[data-task-id="${updatedTaskId}"]`)
        .evaluate((element) => element.classList.contains("is-editing")),
      true,
    );
    assert.equal(
      await page
        .locator(`#task-list li[data-task-id="${updatedTaskId}"] [data-role="edit-error"]`)
        .isVisible(),
      true,
    );
    await page
      .locator(`#task-list li[data-task-id="${updatedTaskId}"] [data-action="cancel"]`)
      .click();

    await input.fill("   ");
    await page.locator("#add-task-button").click();
    assert.equal(await listItems.count(), 2);
    assert.equal(await page.locator("#input-error").isVisible(), true);

    await input.fill("缺少截止时间");
    await page.locator("#priority-input").selectOption("high");
    await page.locator("#add-task-button").click();
    assert.equal(await page.locator("#input-error").textContent(), "请选择截止时间。");

    await page
      .locator("#due-at-input")
      .fill(toLocalDateTimeInput(new Date(Date.now() + 4 * 60 * 60 * 1000)));
    await page.locator("#priority-input").selectOption("");
    await page.locator("#add-task-button").click();
    assert.equal(await page.locator("#input-error").textContent(), "请选择优先级。");

    await page.reload();
    assert.equal(await listItems.count(), 2);
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务二已更新");

    dialogDecision = "dismiss";
    await page.locator("#task-list li").filter({ hasText: "任务一" }).locator('[data-action="delete"]').click();
    assert.equal(await listItems.count(), 2);

    dialogDecision = "accept";
    await page.locator("#task-list li").filter({ hasText: "任务一" }).locator('[data-action="delete"]').click();
    assert.equal(await listItems.count(), 1);

    const remainingTaskId = await listItems.first().getAttribute("data-task-id");
    await listItems.first().locator('[data-action="edit"]').click();
    await page
      .locator(`#task-list li[data-task-id="${remainingTaskId}"] [data-role="edit-due-at"]`)
      .fill(toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
    await page
      .locator(`#task-list li[data-task-id="${remainingTaskId}"] [data-action="save"]`)
      .click();
    assert.equal(await listItems.first().locator(".task-deadline").isVisible(), true);
    assert.match(await listItems.first().locator(".task-deadline").textContent(), /截止/);

    await input.fill("逾期任务");
    await page.locator(".advanced-fields summary").click();
    await page
      .locator("#due-at-input")
      .fill(toLocalDateTimeInput(new Date(Date.now() - 60 * 60 * 1000)));
    await page.locator("#priority-input").selectOption("medium");
    await page.locator("#add-task-button").click();
    const overdueTask = page.locator("#task-list li").filter({ hasText: "逾期任务" });
    assert.equal(await overdueTask.evaluate((element) => element.classList.contains("is-overdue")), true);
    assert.match(await overdueTask.locator(".task-deadline").textContent(), /已逾期/);

    await page.locator('[data-view="overdue"]').click();
    assert.equal(await listItems.count(), 1);
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "逾期任务");
    await page.locator('[data-view="all"]').click();

    await overdueTask.locator('input[type="checkbox"]').check();
    assert.equal(await overdueTask.evaluate((element) => element.classList.contains("is-overdue")), false);
    assert.match(await overdueTask.locator(".task-deadline").textContent(), /截止/);

    const desktopScreenshotPath = path.join(
      process.env.TEMP || path.dirname(__dirname),
      "personal-todo-desktop.png",
    );
    await page.screenshot({ path: desktopScreenshotPath, fullPage: true });

    for (const width of [320, 375, 430]) {
      await page.setViewportSize({ width, height: 800 });
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      assert.equal(hasHorizontalOverflow, false);
    }

    const screenshotPath = path.join(
      process.env.TEMP || path.dirname(__dirname),
      "personal-todo-mobile.png",
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await page
      .locator(`#task-list li[data-task-id="${remainingTaskId}"] [data-action="edit"]`)
      .click();
    await page
      .locator(`#task-list li[data-task-id="${remainingTaskId}"] [data-role="edit-due-at"]`)
      .fill("");
    await page
      .locator(`#task-list li[data-task-id="${remainingTaskId}"] [data-action="save"]`)
      .click();
    assert.equal(
      await page
        .locator(`#task-list li[data-task-id="${remainingTaskId}"] .task-deadline`)
        .count(),
      0,
    );

    const legacyTask = {
      id: "legacy-task",
      title: "旧版本任务",
      completed: false,
      createdAt: "2026-09-30T10:00:00.000Z",
      updatedAt: "2026-09-30T10:00:00.000Z",
    };
    await page.evaluate(
      ({ key, task }) => {
        localStorage.setItem(key, JSON.stringify({ version: 1, tasks: [task] }));
      },
      { key: storageKey, task: legacyTask },
    );
    await page.reload();
    assert.equal(await listItems.count(), 1);
    assert.equal(await listItems.first().locator(".task-deadline").count(), 0);
    await listItems.first().locator('input[type="checkbox"]').check();
    const migratedState = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.equal(migratedState.version, 5);
    assert.equal(migratedState.tasks[0].dueAt, null);

    await page.evaluate(() => {
      localStorage.setItem("personal-todo.mvp.v1", "{broken json");
    });
    await page.reload();
    assert.equal(await listItems.count(), 0);
    assert.equal(await page.locator("#storage-notice").isVisible(), true);

    console.log(
      `E2E passed. Desktop screenshot: ${desktopScreenshotPath}. Mobile screenshot: ${screenshotPath}`,
    );
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
