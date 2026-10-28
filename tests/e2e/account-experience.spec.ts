import { expect, test } from "@playwright/test";

test("account shortcuts and recovery actions remain usable in both languages", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires the read-only local account fixture.");
  if (!baseURL || !["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) throw new Error("Local fixture URL required.");
  const writes: string[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== new URL(baseURL).origin) return route.abort();
    if (new URL(request.url()).pathname === "/api/analytics" && request.method() === "POST") {
      return route.fulfill({ status: 204, body: "" });
    }
    if (!["GET", "HEAD"].includes(request.method())) {
      writes.push(request.method());
      return route.abort();
    }
    return route.continue();
  });

  for (const locale of ["zh", "en"] as const) {
    const prefix = locale === "en" ? "/en" : "";
    await page.context().addCookies([{ name: "enhe_locale", value: locale, url: baseURL }]);
    for (const path of ["/forgot-password", "/reset-password?token=local-preview", "/verify-recovery-email?token=local-preview", "/user/recovery-email"]) {
      await page.setViewportSize({ width: 390, height: 844 });
      const response = await page.goto(`${prefix}${path}`, { waitUntil: "load" });
      expect(response?.status(), path).toBe(200);
      const button = page.locator(".surface-panel button[type='submit']").first();
      await expect(button).toBeVisible();
      await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(button).toHaveCSS("-webkit-text-fill-color", "rgb(255, 255, 255)");
      await button.focus();
      await expect(button).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    }

    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(`${prefix}/user`, { waitUntil: "load" });
      expect(response?.status()).toBe(200);
      const logout = page.locator(".user-center-logout");
      await expect(logout).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(logout).toHaveCSS("-webkit-text-fill-color", "rgb(255, 255, 255)");
      await expect(logout).toHaveCSS("background-color", "rgb(161, 106, 0)");
      await logout.focus();
      await expect(logout).toBeFocused();
      for (const target of ["orders", "purchased-products", "notifications", "account-security"]) {
        const link = page.locator(`.user-center-shortcuts a[href='#${target}']`);
        await expect(link).toBeVisible();
        await link.click();
        await expect(page).toHaveURL(new RegExp(`#${target}$`));
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await expect(page.locator(".redesign-footer-mascot")).toHaveCount(0);
      if (width < 1024) {
        const positions = await page.evaluate(() => ({
          orders: document.querySelector("#orders")!.getBoundingClientRect().top,
          sidebar: document.querySelector(".user-center-page aside")!.getBoundingClientRect().top
        }));
        expect(positions.orders).toBeLessThan(positions.sidebar);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: test.info().outputPath(`account-${locale}-${width}.png`), fullPage: true });
    }
  }
  expect(writes).toEqual([]);
  expect(pageErrors).toEqual([]);
});
