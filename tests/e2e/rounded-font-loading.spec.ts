import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  for (const route of ["/", "/en", "/login", "/en/register"]) {
    test(`approved full rounded font loads and keeps ${route} readable at ${width}px`, async ({ page, baseURL }) => {
      expect(baseURL && new URL(baseURL).hostname).toMatch(/^(localhost|127\.0\.0\.1|\[::1\])$/);
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const fontErrors: string[] = [];
      page.on("console", (message) => {
        if (/OTS parsing error|Failed to decode downloaded font/.test(message.text())) fontErrors.push(message.text());
      });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const font = await page.evaluate(async () => {
        const loaded = await document.fonts.load('400 20px "ENHE Rounded"', "登录注册账号 ENHE Register 0123456789");
        const root = document.querySelector(".enhe-redesign-production") ?? document.body;
        return {
          loaded: loaded.length,
          states: loaded.map((face) => face.status),
          family: getComputedStyle(root).fontFamily,
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(font.loaded).toBeGreaterThan(0);
      expect(font.states.every((state) => state === "loaded")).toBe(true);
      expect(font.family).toContain("ENHE Rounded");
      expect(fontErrors).toEqual([]);
      expect(font.scrollWidth).toBeLessThanOrEqual(font.width + 2);
      await expect(page.locator("main h1").first()).toBeVisible();
      if (route.includes("login") || route.includes("register")) {
        await expect(page.locator(".redesign-footer-mascot")).toHaveCount(0);
        const submit = page.locator('main button[type="submit"]').first();
        await expect(submit).toBeVisible();
        expect(await submit.evaluate((element) => getComputedStyle(element).fontFamily)).toContain("ENHE Rounded");
      } else {
        await expect(page.locator(".redesign-footer-mascot")).toHaveCount(1);
      }
    });
  }
}
