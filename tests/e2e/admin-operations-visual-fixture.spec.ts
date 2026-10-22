import { expect, test } from "@playwright/test";

test("workflow management keeps batch notices black, blue actions readable, and legacy fields white in both languages", async ({ page, context, baseURL }, testInfo) => {
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");
  test.setTimeout(120_000);
  const writes: string[] = [];
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (!["GET", "HEAD"].includes(request.method())) {
      writes.push(request.method());
      await route.abort();
    } else if (new URL(request.url()).origin !== baseURL) {
      await route.abort();
    } else {
      await route.continue();
    }
  });

  for (const locale of ["zh", "en"]) {
    await context.addCookies([{ name: "enhe_locale", value: locale, url: baseURL }]);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto("/admin/ai-workflows?batchExists=1", { waitUntil: "load" });
      expect(response?.status()).toBe(200);
      const panel = page.locator(".enhe-admin-ai-workflows");
      await expect(panel).toBeVisible();
      const batchNotice = panel.getByRole("status").filter({ hasText: locale === "en" ? "A batch for today already exists." : "今天已经有一个批次。" });
      await expect(batchNotice).toBeVisible();
      await expect(batchNotice).toHaveCSS("color", "rgb(0, 0, 0)");
      await expect(batchNotice).toHaveCSS("-webkit-text-fill-color", "rgb(0, 0, 0)");
      const fields = panel.locator('textarea[name="topics"], input[name="scheduleTime"]');
      await expect(fields).toHaveCount(2);
      for (const field of await fields.all()) {
        await expect(field).toHaveCSS("background-color", "rgb(255, 255, 255)");
        await expect(field).toHaveCSS("color", "rgb(0, 0, 0)");
      }
      const actions = panel.locator('a[class*="bg-[#1769C2]"], button[class*="bg-[#1769C2]"]');
      expect(await actions.count()).toBeGreaterThanOrEqual(2);
      for (const action of await actions.all()) {
        await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
        await expect(action).toHaveCSS("-webkit-text-fill-color", "rgb(255, 255, 255)");
      }
      await fields.first().fill("工作效率 | Productivity | SaaS");
      await expect(fields.first()).toHaveValue("工作效率 | Productivity | SaaS");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await batchNotice.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`workflow-batch-notice-${locale}-${width}.png`) });
    }
  }
  expect(writes).toEqual([]);
});

const routes = [
  "/admin",
  "/admin/audit",
  "/admin/development",
  "/admin/releases",
  "/admin/seo-audit",
  "/admin/seo-insights",
  "/admin/messages"
] as const;

test("admin operations routes render across all design breakpoints without overflow or writes", async ({
  page,
  context,
  baseURL
}) => {
  test.setTimeout(120_000);
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");

  const externalRequests: string[] = [];
  const writeRequests: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());

    if (
      requestUrl.origin === baseURL &&
      request.method() === "POST" &&
      requestUrl.pathname === "/__nextjs_original-stack-frames"
    ) {
      await route.continue();
      return;
    }

    if (request.method() !== "GET" && request.method() !== "HEAD") {
      writeRequests.push(`${request.method()} ${request.url()}`);
      await route.abort();
      return;
    }

    if (requestUrl.origin !== baseURL) {
      externalRequests.push(requestUrl.origin);
      await route.abort();
      return;
    }

    await route.continue();
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  for (const width of [320, 390, 480, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "commit" });
      expect(response?.status(), `${route} response`).toBe(200);
      await expect(page.locator(".enhe-admin-shell")).toBeVisible();
      await expect(page.locator("#main-content h1").first()).toBeVisible();
      await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);
      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        mainRight: document.querySelector("#main-content")?.getBoundingClientRect().right ?? 0
      }));
      expect(geometry.document, `${route} document at ${width}px`).toBeLessThanOrEqual(width);
      expect(geometry.mainRight, `${route} main content at ${width}px`).toBeLessThanOrEqual(width);
    }
  }

  expect(externalRequests).toEqual([]);
  expect(writeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
