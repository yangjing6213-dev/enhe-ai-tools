import { expect, test } from "@playwright/test";

const routes = [
  {
    path: "/ai-news/topics/ai-agent",
    locale: "zh",
    navHref: "/ai-news/topics",
    targetLocale: "en",
    targetHref: "/en/ai-news/topics/ai-agent",
  },
  {
    path: "/en/ai-news/topics/ai-agent",
    locale: "en",
    navHref: "/en/ai-news/topics",
    targetLocale: "zh",
    targetHref: "/ai-news/topics/ai-agent",
  },
] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
});

for (const route of routes) {
  test(`${route.path} keeps one section navigation and global locale links on desktop and mobile`, async ({
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
    const desktopResponse = await page.goto(route.path, { waitUntil: "load" });
    expect(desktopResponse?.status()).toBe(200);
    await expect(page.locator("main.ai-news-topic-page")).toBeVisible();

    await expect(page.locator("header.redesign-header")).toHaveCount(1);
    const desktopNav = page.locator(".ai-news-section-nav");
    const desktopActive = desktopNav.locator(`a[aria-current="location"][href="${route.navHref}"]`);
    await expect(desktopActive).toHaveCount(1);
    const desktopLanguageLink = page.locator(`.redesign-desktop-nav .redesign-language-link[href="${route.targetHref}"]`);
    await expect(desktopLanguageLink).toHaveCount(1);
    await expect(desktopLanguageLink).toHaveAttribute("lang", route.targetLocale);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileResponse = await page.goto(route.path, { waitUntil: "load" });
    expect(mobileResponse?.status()).toBe(200);
    const mobileNav = page.locator(".ai-news-section-nav");
    await expect(mobileNav).toBeVisible();
    await expect(
      mobileNav.locator(`a[aria-current="location"][href="${route.navHref}"]`),
    ).toHaveCount(1);
    const mobileLanguageLink = page.locator(`.redesign-mobile-actions .redesign-language-link[href="${route.targetHref}"]`);
    await expect(mobileLanguageLink).toHaveCount(1);
    await expect(mobileLanguageLink).toHaveAttribute("lang", route.targetLocale);
    const mobileSectionLinks = mobileNav.locator("a[href]");
    await mobileSectionLinks.first().focus();
    await expect(mobileSectionLinks.first()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(mobileNav.locator('a[aria-current="location"]')).toBeFocused();
    await page.keyboard.press("Tab");
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest(".ai-news-section-nav")))).toBe(false);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
