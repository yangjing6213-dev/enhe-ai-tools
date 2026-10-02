import { expect, test } from "@playwright/test";

test("site settings remain contained and read-only in the empty local fixture", async ({ page, context, baseURL }) => {
  test.setTimeout(60_000);
  if (!baseURL) throw new Error("The local visual fixture requires an explicit base URL.");

  const externalRequests: string[] = [];
  const writeRequests: string[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL }]);
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (
      requestUrl.origin === baseURL &&
      route.request().method() === "POST" &&
      requestUrl.pathname === "/__nextjs_original-stack-frames"
    ) {
      await route.continue();
      return;
    }
    if (!["GET", "HEAD"].includes(route.request().method())) {
      writeRequests.push(`${route.request().method()} ${route.request().url()}`);
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

  await page.setViewportSize({ width: 1280, height: 900 });
  const response = await page.goto("/admin/settings", { waitUntil: "commit" });
  expect(response?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-shell")).toBeVisible();
  await expect(page.locator("#main-content h1")).toBeVisible();

  for (const width of [320, 390, 480, 768, 1024, 1280, 1440]) {
    await test.step(`/admin/settings fits at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator(".enhe-admin-settings-create-form")).toBeVisible();
      await expect(page.locator(".enhe-admin-settings-list-section")).toBeVisible();
      await expect(page.locator(".enhe-admin-settings-empty")).toBeVisible();
      await expect(page.locator(".enhe-admin-setting-card")).toHaveCount(0);
      await expect(page.locator(".enhe-admin-settings-create-form input[name='key']")).toBeVisible();
      await expect(page.locator(".enhe-admin-settings-create-form input[name='description']")).toBeVisible();
      await expect(page.locator(".enhe-admin-settings-create-form textarea[name='value']")).toBeVisible();
      await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(1);

      const geometry = await page.evaluate(() => {
        const main = document.querySelector("#main-content");
        const form = document.querySelector(".enhe-admin-settings-create-form");
        if (!main || !form) throw new Error("Expected the settings main region and create form.");
        const mainRect = main.getBoundingClientRect();
        const formRect = form.getBoundingClientRect();
        return {
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          mainLeft: mainRect.left,
          mainRight: mainRect.right,
          formLeft: formRect.left,
          formRight: formRect.right
        };
      });

      expect(geometry.viewport).toBe(width);
      expect(geometry.document, "settings document overflow").toBeLessThanOrEqual(width);
      expect(geometry.mainLeft, "settings main left edge").toBeGreaterThanOrEqual(0);
      expect(geometry.mainRight, "settings main right edge").toBeLessThanOrEqual(width);
      expect(geometry.formLeft, "settings form left edge").toBeGreaterThanOrEqual(geometry.mainLeft);
      expect(geometry.formRight, "settings form right edge").toBeLessThanOrEqual(geometry.mainRight);
    });
  }

  expect(externalRequests).toEqual([]);
  expect(writeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
