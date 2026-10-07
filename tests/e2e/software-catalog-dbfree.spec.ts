import { expect, test } from "@playwright/test";

const routes = ["/software", "/en/software"] as const;
const widths = [320, 390, 480, 768, 1024, 1440] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
});

for (const route of routes) {
  for (const width of widths) {
    test(`${route} stays explicitly DB-free at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const requestFailures: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        requestFailures.push(
          `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
        );
      });

      const response = await page.goto(route, { waitUntil: "load" });

      expect(response?.status(), `${route} at ${width}px`).toBe(200);
      await expect(page.locator('[data-content-status="UNVERIFIED"]')).toBeVisible();
      await expect(page.locator("h1:visible")).toHaveCount(1);
      await expect(page.locator(".redesign-software-empty")).toBeVisible();
      await expect(page.locator(".redesign-software-empty-action")).toHaveCount(1);
      await expect(page.locator(".redesign-software-empty-action")).toHaveAttribute(
        "href",
        route === "/en/software" ? "/en" : "/",
      );

      const action = page.locator(".redesign-software-empty-action");
      await action.focus();
      await expect(action).toBeFocused();
      const actionA11y = await action.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          height: rect.height,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      });
      expect(actionA11y.height, `${route} at ${width}px action touch target`).toBeGreaterThanOrEqual(48);
      expect(actionA11y.outlineStyle).toBe("solid");
      expect(Number.parseFloat(actionA11y.outlineWidth)).toBeGreaterThanOrEqual(3);
      expect(actionA11y.boxShadow, "focused action needs a dark guard").not.toBe("none");
      await expect(page.locator("[data-production-catalog]"), "DB-free shell must not claim production catalog").toHaveCount(0);
      await expect(page.locator("[data-catalog-card]"), "DB-free shell must not render product cards").toHaveCount(0);

      const robots = page.locator('meta[name="robots"]');
      await expect(robots).toHaveAttribute("content", /noindex/i);
      await expect(robots).toHaveAttribute("content", /follow/i);

      const structuredData = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      expect(structuredData.join("\n"), "DB-free shell must not emit product listing schema").not.toMatch(
        /CollectionPage|ItemList|Product/,
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} at ${width}px`).toBe(0);
      expect(consoleErrors, `${route} console errors`).toEqual([]);
      expect(pageErrors, `${route} page errors`).toEqual([]);
      expect(requestFailures, `${route} failed requests`).toEqual([]);
    });
  }
}
