import { expect, test, type Page } from "@playwright/test";

type Diagnostics = {
  externalRequests: string[];
  blockedWrites: string[];
  pageErrors: string[];
  consoleErrors: string[];
};

const diagnostics = new WeakMap<Page, Diagnostics>();
const editors = [
  "/admin/faqs/new",
  "/admin/tutorials/new",
  "/admin/changelogs/new"
];

test.beforeEach(async ({ page, context, baseURL }) => {
  if (!baseURL || new URL(baseURL).hostname !== "127.0.0.1") {
    throw new Error("The empty-tools browser fixture must use its local loopback server.");
  }

  const result: Diagnostics = {
    externalRequests: [],
    blockedWrites: [],
    pageErrors: [],
    consoleErrors: []
  };
  diagnostics.set(page, result);
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== baseURL) {
      result.externalRequests.push(requestUrl.origin);
      await route.abort();
      return;
    }
    if (!(["GET", "HEAD"] as string[]).includes(request.method())) {
      result.blockedWrites.push(`${request.method()} ${requestUrl.pathname}`);
      await route.abort();
      return;
    }
    await route.continue();
  });
  page.on("pageerror", (error) => result.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") result.consoleErrors.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  const result = diagnostics.get(page);
  expect(result?.externalRequests).toEqual([]);
  expect(result?.blockedWrites).toEqual([]);
  expect(result?.pageErrors).toEqual([]);
  expect(result?.consoleErrors).toEqual([]);
  diagnostics.delete(page);
});

test("empty content editors guide admins to add a tool without leaving the local read-only flow", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });

    for (const editor of editors) {
      await test.step(`${editor} explains the empty tool list at ${width}px`, async () => {
        const response = await page.goto(editor, { waitUntil: "load" });
        expect(response?.status(), editor).toBe(200);
        await expect(page.locator("#main-content h1")).toBeVisible();
        await expect(page.getByRole("status")).toContainText("当前还没有可关联的 AI 软件应用");
        const createLink = page.getByRole("link", { name: "新增 AI 软件应用" });
        await expect(createLink).toHaveAttribute("href", "/admin/software/new");

        const toolSelect = page.locator('select[name="toolId"]');
        await expect(toolSelect).toHaveAttribute("required", "");
        await expect(toolSelect.locator("option")).toHaveCount(1);
        await expect(toolSelect.locator("option").first()).toHaveValue("");
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

        await createLink.click();
        await expect(page).toHaveURL(/\/admin\/software\/new$/);
        await expect(page.locator(".enhe-admin-tool-editor-form")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }
  }
});
