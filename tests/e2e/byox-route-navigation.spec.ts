import { expect, test, type Page } from "@playwright/test";

async function waitForScrollToSettle(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    let previousY = window.scrollY;
    let stableFrames = 0;
    const check = () => {
      stableFrames = window.scrollY === previousY ? stableFrames + 1 : 0;
      previousY = window.scrollY;
      if (stableFrames >= 5) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }));
}

for (const locale of ["zh", "en"] as const) {
  for (const width of [390, 1440]) {
    const path = `${locale === "en" ? "/en" : ""}/build-your-own-x`;
    const routeLabel = locale === "en" ? "Learning route" : "学习路线";

    test.describe(`${locale} at ${width}px`, () => {
      test.setTimeout(60_000);
      test.beforeEach(async ({ page, baseURL }) => {
        if (process.env.DATABASE_URL?.trim()) throw new Error("BYOX checks require an unset DATABASE_URL.");
        if (!baseURL || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
          throw new Error("BYOX checks require a local base URL.");
        }
        await page.route("**/*", async (route) => {
          const request = route.request();
          const url = new URL(request.url());
          if (url.origin !== new URL(baseURL).origin) {
            await route.abort();
            throw new Error(`Unexpected external request: ${url.origin}`);
          }
          // Analytics is unrelated to route selection; keep it entirely local.
          if (url.pathname === "/api/analytics") {
            await route.fulfill({ status: 204 });
            return;
          }
          if (!["GET", "HEAD"].includes(request.method())) {
            await route.abort();
            throw new Error(`Unexpected write request: ${request.method()} ${url.pathname}`);
          }
          await route.continue();
        });
        await page.setViewportSize({ width, height: 900 });
      });

      test(`${locale} BYOX quick links select and reveal their route at ${width}px`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const response = await page.goto(path, { waitUntil: "load" });
        expect(response?.status()).toBe(200);
        const routeSelect = page.getByRole("combobox", { name: routeLabel, exact: true });
        await expect(routeSelect).toHaveValue("backend-systems");

        for (const slug of ["computer-systems", "ai-engineering"]) {
          await page.locator(`.byox-quick-card[href='#route-${slug}']`).click();
          await expect(routeSelect).toHaveValue(slug);
          await expect(page.locator(`.byox-route-panel#route-${slug}`)).toBeInViewport();
          if (slug === "computer-systems") {
            await page.goBack();
            await expect(routeSelect).toHaveValue("backend-systems");
            expect(new URL(page.url()).hash).toBe("");
            await page.goForward();
            await expect(routeSelect).toHaveValue("computer-systems");
            await expect(page.locator(".byox-route-panel#route-computer-systems")).toBeInViewport();
          }
        }

        await page.goBack();
        await expect(routeSelect).toHaveValue("computer-systems");
        await page.goForward();
        await expect(routeSelect).toHaveValue("ai-engineering");
        await page.locator(".byox-route-section summary").click();
        await page.locator(".byox-route-card a[href='#route-developer-tools']").click();
        await expect(routeSelect).toHaveValue("developer-tools");
        await expect(page.locator(".byox-route-panel#route-developer-tools")).toBeInViewport();

        await routeSelect.selectOption("frontend-depth");
        await expect(page.locator(".byox-route-panel#route-frontend-depth")).toBeVisible();
        await page.locator(".byox-quick-card[href='#route-ai-engineering']").click();
        await expect(routeSelect).toHaveValue("ai-engineering");
        await expect(page.locator(".byox-route-panel#route-ai-engineering")).toBeInViewport();
        await page.getByRole("button", { name: locale === "en" ? "Reset" : "重置", exact: true }).click();
        await expect(routeSelect).toHaveValue("backend-systems");
        await expect(page.locator(".byox-route-panel#route-backend-systems")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        expect(errors).toEqual([]);
      });

      test(`${locale} BYOX direct route links survive reload and unknown fragments at ${width}px`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const response = await page.goto(`${path}#route-ai-engineering`, { waitUntil: "load" });
        expect(response?.status()).toBe(200);
        const routeSelect = page.getByRole("combobox", { name: routeLabel, exact: true });
        await expect(routeSelect).toHaveValue("ai-engineering");
        await expect(page.locator(".byox-route-panel#route-ai-engineering")).toBeInViewport();
        await page.reload({ waitUntil: "load" });
        await expect(routeSelect).toHaveValue("ai-engineering");

        await page.goto(`${path}#route-not-a-route`, { waitUntil: "load" });
        await expect(routeSelect).toHaveValue("ai-engineering");
        await page.reload({ waitUntil: "load" });
        await expect(routeSelect).toHaveValue("backend-systems");
        await expect(page.locator(".byox-route-panel#route-backend-systems")).toBeVisible();
        expect(errors).toEqual([]);
      });

      test(`${locale} BYOX route controls keep their focus and viewport at ${width}px`, async ({ page }) => {
        await page.goto(path, { waitUntil: "load" });
        const routeSelect = page.getByRole("combobox", { name: routeLabel, exact: true });
        await routeSelect.scrollIntoViewIfNeeded();
        await routeSelect.focus();
        await waitForScrollToSettle(page);
        const beforeSelection = await page.evaluate(() => window.scrollY);
        await routeSelect.press("End");
        await routeSelect.press("Enter");
        await expect(routeSelect).toHaveValue("developer-tools");
        await waitForScrollToSettle(page);
        await expect(routeSelect).toBeFocused();
        await expect(routeSelect).toBeInViewport();
        expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(beforeSelection, 0);

        const reset = page.getByRole("button", { name: locale === "en" ? "Reset" : "重置", exact: true });
        await reset.scrollIntoViewIfNeeded();
        await reset.focus();
        await waitForScrollToSettle(page);
        const beforeReset = await page.evaluate(() => window.scrollY);
        await reset.press("Enter");
        await expect(routeSelect).toHaveValue("backend-systems");
        await waitForScrollToSettle(page);
        await expect(reset).toBeFocused();
        await expect(reset).toBeInViewport();
        expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(beforeReset, 0);
      });

      test(`${locale} BYOX linked route scroll is immediate with reduced motion at ${width}px`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.addInitScript(() => {
          const original = Element.prototype.scrollIntoView;
          Element.prototype.scrollIntoView = function (options) {
            original.call(this, options);
            if (this.matches(".byox-route-panel")) {
              const box = this.getBoundingClientRect();
              this.setAttribute("data-route-immediately-in-view", String(box.top < window.innerHeight && box.bottom > 0));
            }
          };
        });
        await page.goto(`${path}#route-ai-engineering`, { waitUntil: "load" });
        const panel = page.locator(".byox-route-panel#route-ai-engineering");
        await expect(panel).toHaveAttribute("data-route-immediately-in-view", "true");
        await expect(panel).toBeInViewport();
      });
    });
  }
}
