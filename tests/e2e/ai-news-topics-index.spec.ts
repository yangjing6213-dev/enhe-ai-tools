import { expect, test } from "@playwright/test";
import { isSameLoopbackOrigin } from "../fixtures/loopback-origin";

for (const locale of ["zh", "en"] as const) {
  for (const width of [320, 390, 1440]) {
    test(`Topics navigation opens the collection: ${locale}, ${width}px`, async ({ page, baseURL }) => {
      if (process.env.DATABASE_URL?.trim() || !baseURL || !isSameLoopbackOrigin(baseURL, baseURL)) {
        throw new Error("Topics collection checks require a DB-free local server.");
      }
      const errors: string[] = [];
      const writes: string[] = [];
      const external: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      await page.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (!isSameLoopbackOrigin(request.url(), baseURL)) {
          external.push(request.url());
          return route.abort();
        }
        if (url.pathname === "/api/analytics") return route.fulfill({ status: 204 });
        if (!["GET", "HEAD"].includes(request.method())) {
          writes.push(`${request.method()} ${url.pathname}`);
          return route.abort();
        }
        return route.continue();
      });
      const prefix = locale === "en" ? "/en" : "";
      const target = `${prefix}/ai-news/topics`;
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${prefix}/ai-news`, { waitUntil: "load" });
      const nav = ".ai-news-section-nav";
      const response = page.waitForResponse((response) => new URL(response.url()).pathname === target && response.request().isNavigationRequest());
      await page.locator(`${nav} a[href="${target}"]`).click();
      expect((await response).status()).toBe(200);
      await page.waitForLoadState("load");
      await expect(page.locator("main[data-content-status='UNVERIFIED']")).toBeVisible();
      await expect(page.locator("header.redesign-header")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: locale === "en" ? "Topic Collections" : "专题合集", exact: true })).toBeVisible();
      await expect(page.locator(`${nav} a[aria-current="page"]`)).toHaveAttribute("href", target);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex.*follow/);
      const languageSurface = width < 768 ? ".redesign-mobile-actions" : ".redesign-desktop-nav";
      const languageLink = page.locator(`${languageSurface} .redesign-language-link[lang="${locale === "zh" ? "en" : "zh"}"]`);
      await expect(languageLink).toHaveAttribute("href", `${locale === "zh" ? "/en" : ""}/ai-news/topics`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`topics-${locale}-${width}.png`), fullPage: true });
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
      expect(external).toEqual([]);
    });
  }
}
