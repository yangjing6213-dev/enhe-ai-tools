import { expect, test } from "@playwright/test";

const routes = [
  { path: "/ai-news", locale: "zh" },
  { path: "/en/ai-news", locale: "en" },
  { path: "/ai-news/topics/ai-agent", locale: "zh" },
  { path: "/en/ai-news/topics/ai-agent", locale: "en" },
] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
});

for (const route of routes) {
  test(`${route.path} remains readable at 200% text zoom`, async ({ page }) => {
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

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route.path, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);

    await page.addStyleTag({
      content: "html { font-size: 200% !important; }",
    });

    const layout = await page.locator("main.ai-news-page").evaluate((main) => {
      const viewportWidth = document.documentElement.clientWidth;
      const mainRect = main.getBoundingClientRect();
      const status = main.querySelector<HTMLElement>(
        '[data-content-status="UNVERIFIED"], [role="status"]',
      );
      const statusRect = status?.getBoundingClientRect();

      return {
        viewportWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        mainLeft: mainRect.left,
        mainRight: mainRect.right,
        statusVisible: Boolean(statusRect && statusRect.width > 0 && statusRect.height > 0),
        statusRight: statusRect?.right ?? 0,
        statusTextVisible: Boolean(status?.textContent?.trim()),
        headingVisible: Boolean(
          main.querySelector("h1")?.getBoundingClientRect().height,
        ),
      };
    });

    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.mainLeft).toBeGreaterThanOrEqual(0);
    expect(layout.mainRight).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.statusVisible).toBe(true);
    expect(layout.statusRight).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.statusTextVisible).toBe(true);
    expect(layout.headingVisible).toBe(true);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test(`${route.path} keeps content and focus visible in forced colors`, async ({
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

    await page.emulateMedia({ forcedColors: "active" });
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route.path, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("main.ai-news-page")).toBeVisible();
    const statePanel = page.locator(
      'main.ai-news-page [role="status"], main.ai-news-page section[data-content-status="UNVERIFIED"]',
    );
    await expect(statePanel).toHaveCount(1);
    await expect(statePanel).toBeVisible();
    expect((await statePanel.innerText()).trim()).not.toBe("");
    await expect(page.locator("main.ai-news-page h1")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      route.locale === "en" ? /^en(?:-|$)/ : /^zh(?:-|$)/,
    );
    await expect(page.locator(".redesign-skip-link")).toBeAttached();

    const sectionNav = page.locator(".ai-news-section-nav");
    await expect(sectionNav).toBeVisible();
    const expectedCurrentState = route.path.includes("/topics/") ? "location" : "page";
    const currentSectionNavItem = sectionNav.locator(`a[aria-current="${expectedCurrentState}"]`);
    await expect(currentSectionNavItem).toHaveCount(1);
    const currentSectionNavStyles = await currentSectionNavItem.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { borderWidth: styles.borderBottomWidth, textColor: styles.color };
    });
    expect(currentSectionNavStyles.borderWidth).toBe("2px");
    expect(currentSectionNavStyles.textColor).not.toBe("rgba(0, 0, 0, 0)");

    await currentSectionNavItem.focus();
    const sectionFocus = await currentSectionNavItem.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { active: document.activeElement === element, outlineWidth: styles.outlineWidth };
    });
    expect(sectionFocus.active).toBe(true);
    expect(sectionFocus.outlineWidth).not.toBe("0px");

    const focusTarget = page.locator(
      route.path.includes("/topics/")
        ? 'main.ai-news-page a[href*="/ai-news"]'
        : ".redesign-skip-link",
    );
    await focusTarget.first().focus();
    const focusStyles = await focusTarget.first().evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        active: document.activeElement === element,
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
      };
    });
    expect(focusStyles.active).toBe(true);
    expect(focusStyles.outlineStyle).not.toBe("none");
    expect(focusStyles.outlineWidth).not.toBe("0px");
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
