import { expect, test } from "@playwright/test";

const query =
  "q=agent%20workflow&category=category-a&tag=tag-a&sort=hot&page=2&ignored=drop";
const expectedQuery =
  "q=agent+workflow&category=category-a&tag=tag-a&sort=hot&page=2";
const expectedPaginationQuery =
  "q=agent+workflow&category=category-a&tag=tag-a&sort=hot";
const routes = [
  {
    path: `/ai-news?${query}`,
    locale: "zh",
    targetLocale: "en",
    expectedHref: `/en/ai-news?${expectedQuery}`,
  },
  {
    path: `/en/ai-news?${query}`,
    locale: "en",
    targetLocale: "zh",
    expectedHref: `/ai-news?${expectedQuery}`,
  },
  {
    path: `/ai-news/page/2?${query}`,
    locale: "zh",
    targetLocale: "en",
    expectedHref: `/en/ai-news/page/2?${expectedPaginationQuery}`,
  },
  {
    path: `/en/ai-news/page/2?${query}`,
    locale: "en",
    targetLocale: "zh",
    expectedHref: `/ai-news/page/2?${expectedPaginationQuery}`,
  },
] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
});

for (const route of routes) {
  test(`${route.path} preserves filters in the locale switcher`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto(route.path, { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(page.locator("main.ai-news-page")).toBeVisible();
    await expect(page.locator('[data-content-status="UNVERIFIED"]')).toBeVisible();

    const robots = await page
      .locator('meta[name="robots"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("content") ?? ""),
      );
    expect(
      robots.some((content) => /noindex/i.test(content) && /follow/i.test(content)),
    ).toBe(true);

    await expect(page.locator("header.redesign-header")).toHaveCount(1);
    const globalSwitcherHrefs = await page
      .locator(`.redesign-desktop-nav .redesign-language-link[lang="${route.targetLocale}"]`)
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
    expect(globalSwitcherHrefs).toEqual([route.expectedHref]);
    expect(JSON.stringify(globalSwitcherHrefs)).not.toContain("ignored");

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
