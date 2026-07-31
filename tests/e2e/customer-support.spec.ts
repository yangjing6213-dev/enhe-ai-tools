import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
});

test("opens, answers an FAQ, and closes the Chinese support widget", async ({ page }) => {
  await page.goto("/");

  const launcher = page.getByRole("button", { name: "客服", exact: true });
  await expect(launcher).toBeVisible();
  await launcher.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "如何找到适合我的产品？" }).click();
  await expect(dialog).toContainText("提升工作效率");

  await page.getByRole("button", { name: "关闭客服" }).click();
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeVisible();
});

test("renders English support copy", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Chat", exact: true }).click();

  await expect(page.getByRole("dialog")).toContainText("What is ENHE AI?");
  await expect(page.getByRole("dialog")).toContainText("Common questions");
});

test("submits a message through the mocked support API", async ({ page }) => {
  await page.route("**/api/support", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.postDataJSON()).toMatchObject({
      message: "我想了解购买流程",
      email: "visitor@example.com",
      locale: "zh",
      pagePath: "/"
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "客服", exact: true }).click();
  await page.getByRole("button", { name: "没有找到答案，提交留言" }).click();
  await page.getByLabel("问题内容（必填）").fill("我想了解购买流程");
  await page.getByLabel("联系邮箱（可选）").fill("visitor@example.com");
  await page.getByRole("button", { name: "发送留言" }).click();

  await expect(page.getByRole("status")).toContainText("留言已发送");
});

test("shows a localized rate limit message", async ({ page }) => {
  await page.route("**/api/support", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, code: "RATE_LIMITED" })
    })
  );

  await page.goto("/");
  await page.getByRole("button", { name: "客服", exact: true }).click();
  await page.getByRole("button", { name: "没有找到答案，提交留言" }).click();
  await page.getByLabel("问题内容（必填）").fill("重复提交测试");
  await page.getByRole("button", { name: "发送留言" }).click();

  await expect(page.getByRole("status")).toContainText("提交次数过多");
});

test("does not render on authentication or admin routes", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "客服", exact: true })).toHaveCount(0);

  await page.goto("/admin/__support-widget-test");
  await expect(page.getByRole("button", { name: "客服", exact: true })).toHaveCount(0);
});

test("fits within a mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "客服", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});
