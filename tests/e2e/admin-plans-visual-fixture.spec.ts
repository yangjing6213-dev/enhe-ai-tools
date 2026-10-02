import { expect, test } from "@playwright/test";

test("disabled plan notice uses the light shell without enabling plan actions", async ({ page, context, baseURL }) => {
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
  const response = await page.goto("/admin/plans", { waitUntil: "commit" });
  expect(response?.status()).toBe(200);
  await expect(page.locator(".enhe-admin-shell")).toBeVisible();
  await expect(page.locator("#main-content h1")).toBeVisible();

  for (const width of [320, 390, 480, 768, 1024, 1280, 1440]) {
    await test.step(`/admin/plans fits at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 });
      const card = page.locator(".enhe-admin-plans-disabled-card");
      const cta = page.locator(".enhe-admin-plans-cta");
      await expect(card).toBeVisible();
      await expect(cta).toHaveAttribute("href", "/admin/software");
      await expect(cta).toBeVisible();
      await expect(page.locator("form")).toHaveCount(0);
      await expect(page.locator(".admin-nav-link[aria-current='page']")).toHaveCount(0);

      const geometry = await page.evaluate(() => {
        const main = document.querySelector("#main-content");
        const card = document.querySelector(".enhe-admin-plans-disabled-card");
        if (!main || !card) throw new Error("Expected the plans main region and disabled notice.");
        const mainRect = main.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        return {
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          mainLeft: mainRect.left,
          mainRight: mainRect.right,
          cardLeft: cardRect.left,
          cardRight: cardRect.right
        };
      });

      expect(geometry.viewport).toBe(width);
      expect(geometry.document, "plans document overflow").toBeLessThanOrEqual(width);
      expect(geometry.mainLeft, "plans main left edge").toBeGreaterThanOrEqual(0);
      expect(geometry.mainRight, "plans main right edge").toBeLessThanOrEqual(width);
      expect(geometry.cardLeft, "plans card left edge").toBeGreaterThanOrEqual(geometry.mainLeft);
      expect(geometry.cardRight, "plans card right edge").toBeLessThanOrEqual(geometry.mainRight);
    });
  }

  expect(externalRequests).toEqual([]);
  expect(writeRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
