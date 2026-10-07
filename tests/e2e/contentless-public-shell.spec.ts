import { expect, test } from "@playwright/test";

const routes = [
  "/ai-news",
  "/en/ai-news",
  "/ai-news/topics/ai-agent",
  "/en/ai-news/topics/ai-agent",
  "/ai-skills",
  "/en/ai-skills",
  "/account-services",
  "/en/account-services",
  "/online-tools",
  "/en/online-tools",
  "/skill-learning",
  "/en/skill-learning",
  "/tutorials",
  "/en/tutorials",
  "/ai-trends",
  "/en/ai-trends",
  "/product-paths/work-efficiency",
  "/en/product-paths/work-efficiency",
  "/product-demos",
  "/en/product-demos",
  "/ai-trends/daily",
  "/en/ai-trends/daily",
] as const;

for (const route of routes) {
  test(`${route} exposes a complete contentless public shell`, async ({ page }) => {
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

    const response = await page.goto(route, { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    const shell = page.locator('main[data-shell-state="contentless"]');
    await expect(shell).toBeVisible();
    await expect(shell.locator("h1")).toHaveCount(1);
    await expect(shell.locator('[role="status"] .enhe-contentless-actions')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /follow/i,
    );

    const pageState = await shell.evaluate((element) => ({
      text: element.textContent ?? "",
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      schemaTypes: Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
      ).flatMap((script) => {
        try {
          const value = JSON.parse(script.textContent ?? "");
          const collectTypes = (entry: unknown): string[] => {
            if (Array.isArray(entry)) return entry.flatMap(collectTypes);
            if (!entry || typeof entry !== "object") return [];
            const record = entry as { [key: string]: unknown };
            const ownType =
              typeof record["@type"] === "string" ? [record["@type"]] : [];
            return [...ownType, ...collectTypes(record["@graph"] ?? [])];
          };
          return collectTypes(value);
        } catch {
          return [];
        }
      }),
    }));

    expect(pageState.scrollWidth).toBeLessThanOrEqual(pageState.viewportWidth);
    expect(pageState.schemaTypes).not.toEqual(
      expect.arrayContaining([
        "CollectionPage",
        "ItemList",
        "Product",
        "NewsArticle",
        "FAQPage",
      ]),
    );
    if (route.startsWith("/en/")) {
      expect(pageState.text).not.toMatch(/[\u3400-\u9fff]/);
    }

    const primaryAction = shell.locator(".enhe-contentless-action-primary");
    await expect(primaryAction).toBeVisible();
    await expect(primaryAction).toHaveCSS("min-height", "48px");
    await primaryAction.focus();
    await expect(primaryAction).toBeFocused();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

test.describe("contentless shell responsive boundary", () => {
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`AI News stays usable at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const response = await page.goto("/ai-news", { waitUntil: "networkidle" });

      expect(response?.status()).toBe(200);
      await expect(page.locator('main[data-shell-state="contentless"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width,
      );
    });
  }
});
