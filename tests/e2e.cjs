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
    await input.press("Enter");
    assert.equal(await listItems.count(), 1);
    assert.equal(await input.inputValue(), "");

    await input.fill("任务二");
    await page.locator("#add-task-button").click();
    assert.equal(await listItems.count(), 2);
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务二");

    const taskOne = page.locator("#task-list li").filter({ hasText: "任务一" });
    await taskOne.locator('input[type="checkbox"]').check();
    await page.locator('[data-filter="active"]').click();
    assert.equal(await listItems.count(), 1);
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务二");

    await page.locator('[data-filter="completed"]').click();
    assert.equal(await listItems.count(), 1);
    assert.equal(await listItems.first().locator('[data-role="task-title"]').textContent(), "任务一");

    await page.locator('[data-filter="all"]').click();
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
    await page
      .locator("#due-at-input")
      .fill(toLocalDateTimeInput(new Date(Date.now() - 60 * 60 * 1000)));
    await page.locator("#add-task-button").click();
    const overdueTask = page.locator("#task-list li").filter({ hasText: "逾期任务" });
    assert.equal(await overdueTask.evaluate((element) => element.classList.contains("is-overdue")), true);
    assert.match(await overdueTask.locator(".task-deadline").textContent(), /已逾期/);

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
    assert.equal(migratedState.version, 2);
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
