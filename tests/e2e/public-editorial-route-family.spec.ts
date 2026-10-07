import { expect, test } from "@playwright/test";

const routes = [
  "/about",
  "/en/about",
  "/legal/privacy-policy",
  "/en/legal/privacy-policy",
  "/ai-topics",
  "/en/ai-topics",
  "/build-your-own-x",
  "/en/build-your-own-x",
  "/pricing",
  "/en/pricing",
  "/search",
  "/en/search",
] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
});

for (const route of routes) {
  test(`${route} exposes the editorial shell without horizontal overflow`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route, { waitUntil: "load" });

    expect(response?.status(), route).toBe(200);
    const main = route.endsWith("/pricing")
      ? page.locator('main[data-shell-state="contentless"]')
      : page.locator("main.enhe-editorial-page");
    await expect(main).toHaveCount(1);
    await expect(main.locator("h1")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    if (route.endsWith("/pricing")) {
      await expect(main).toHaveAttribute("data-content-status", "UNVERIFIED");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /follow/i);
    }

    if (route.endsWith("/search")) {
      await expect(main).toHaveAttribute("data-content-status", "UNVERIFIED");
    }

    expect(consoleErrors, route).toEqual([]);
    expect(pageErrors, route).toEqual([]);
    expect(failedRequests, route).toEqual([]);
  });
}
