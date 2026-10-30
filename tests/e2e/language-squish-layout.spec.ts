import { expect, test } from "@playwright/test";

for (const width of [320, 768, 1366, 1920]) {
  test(`language switch fits and hero positions match at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const positions: number[][] = [];
    for (const path of ["/", "/en"]) {
      await page.goto(path);
      const breadcrumb = page.getByRole("navigation", { name: path === "/en" ? "Breadcrumb" : "面包屑导航" });
      await expect(breadcrumb).toHaveCount(0);
      await expect(page.locator(".site-back-nav")).toHaveCount(0);
      const toggle = page.locator('.redesign-header .enhe-language-toggle:visible');
      await expect(toggle.getByRole("switch")).toHaveAttribute("aria-checked", path === "/en" ? "true" : "false");
      const rect = (await toggle.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      await expect(toggle.locator('.squish-switch__track')).toHaveCSS("height", "32px");
      const track = (await toggle.locator('.squish-switch__track').boundingBox())!;
      for (const link of await toggle.locator('.redesign-language-link').all()) {
        const text = (await link.boundingBox())!;
        expect(text.x).toBeGreaterThanOrEqual(track.x);
        expect(text.x + text.width).toBeLessThanOrEqual(track.x + track.width);
        expect(text.y + text.height).toBeLessThanOrEqual(track.y + track.height);
        const expectedColor = await link.getAttribute("aria-current") === "page"
          ? "rgb(4, 98, 194)"
          : "rgb(255, 255, 255)";
        await expect(link).toHaveCSS("color", expectedColor);
        await expect(link).toHaveCSS("-webkit-text-fill-color", expectedColor);
      }
      if (width >= 900) {
        await page.waitForTimeout(500);
        positions.push(await page.locator('h1, .redesign-home-subtitle, .redesign-home-cta-row > .redesign-home-cta:first-child, .redesign-home-features').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().top)));
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    if (positions.length) positions[0].forEach((top, i) => expect(Math.abs(top - positions[1][i])).toBeLessThan(2));
  });
}

test("switch supports mouse and keyboard, remembers language and preserves the current route", async ({ page, context }) => {
  await page.goto("/about");
  await page.locator('.redesign-header .squish-switch:visible').click();
  await expect(page).toHaveURL(/\/en\/about$/);
  expect((await context.cookies()).find(c => c.name === "enhe_locale")?.value).toBe("en");
  await page.reload();
  const toggle = page.locator('.redesign-header .squish-switch:visible');
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/\/about$/);
  const breadcrumb = page.getByRole("navigation", { name: "面包屑导航" });
  await expect(breadcrumb).toBeVisible();
  await expect(breadcrumb.getByText("首页")).toBeVisible();
  await expect(breadcrumb.locator('[aria-current="page"]')).toBeVisible();
  await expect(page.locator(".site-back-nav")).toHaveCount(0);
});

test("touch switch works with reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/about");
  await page.locator('.redesign-header .squish-switch:visible').tap();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(page.locator('.redesign-header .squish-switch:visible')).toHaveAttribute("aria-checked", "true");
  await context.close();
});

test("top-level non-product cards remain static", async ({ page }) => {
  await page.goto("/about");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const card = page.locator('.enhe-reference-editorial-card').first();
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + 3, box.y + box.height / 2);
  await expect(card).toHaveAttribute("data-top-level-card-static", "true");
  await expect(card).toHaveCSS("transform", "none");
  await expect(page.locator('.enhe-edge-effect')).toHaveCount(0);
});
