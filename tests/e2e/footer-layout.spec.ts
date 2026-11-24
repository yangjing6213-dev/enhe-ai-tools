import { expect, test } from "@playwright/test";

test("bookmark control keeps the same square frame as the social icons on hover", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const footer = page.locator(".redesign-footer");
  await footer.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);

  const controls = footer.locator(".footer-social-links > a, .footer-social-links > .favorite-site-action > button");
  await expect(controls).toHaveCount(4);
  const initialFrames = await controls.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height, radius: style.borderRadius, borderWidth: style.borderTopWidth, borderStyle: style.borderTopStyle };
  }));
  expect(initialFrames).toEqual(Array.from({ length: 4 }, () => ({ width: 40, height: 40, radius: "8px", borderWidth: "1px", borderStyle: "solid" })));

  const bookmark = footer.locator(".footer-social-bookmark");
  await bookmark.hover();
  await expect(bookmark).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(bookmark).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(bookmark).toHaveCSS("transform", "none");
  const hoveredFrame = await bookmark.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height, radius: style.borderRadius, borderWidth: style.borderTopWidth, borderStyle: style.borderTopStyle };
  });
  expect(hoveredFrame).toEqual(initialFrames[0]);
});

test.describe("footer menu layout", () => {
  for (const { locale, width } of [
    { locale: "zh", width: 1920 },
    { locale: "zh", width: 1024 },
    { locale: "zh", width: 390 },
    { locale: "en", width: 1920 },
    { locale: "en", width: 1024 },
    { locale: "en", width: 390 },
  ]) {
    test(`${locale} footer keeps its height while menus open at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(locale === "en" ? "/en" : "/");

      const footer = page.locator(".redesign-footer");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeVisible();
      const initialHeight = await footer.evaluate((element) => element.getBoundingClientRect().height);
      const expectedHeight = width >= 1280 ? 276 : width >= 768 ? 328 : locale === "en" ? 528 : 448;
      expect(initialHeight).toBe(expectedHeight);

      const verticalLayout = await footer.evaluate((element) => {
        const slogan = element.querySelector(".redesign-home-brand-value-inner h2")!.getBoundingClientRect();
        const legal = element.querySelector(".footer-bottom")!.getBoundingClientRect();
        return { sloganBottom: slogan.bottom, legalTop: legal.top, legalBottom: legal.bottom, footerBottom: element.getBoundingClientRect().bottom };
      });
      expect(verticalLayout.legalTop - verticalLayout.sloganBottom).toBeLessThan(width >= 1280 ? 100 : width >= 768 ? 170 : 160);
      expect(verticalLayout.legalBottom).toBeLessThanOrEqual(verticalLayout.footerBottom);

      for (const menu of await footer.locator(".footer-navigation details").all()) {
        const summary = menu.locator("summary");
        await summary.click();
        await expect(menu).toHaveAttribute("open", "");
        const panel = menu.locator(".footer-group-links");
        await expect(panel.locator("a").first()).toBeVisible();
        const panelBounds = await panel.boundingBox();
        expect(panelBounds).not.toBeNull();
        expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
        expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(width);
        await expect
          .poll(() => footer.evaluate((element) => element.getBoundingClientRect().height))
          .toBe(initialHeight);
        await summary.click();
        await expect(menu).not.toHaveAttribute("open", "");
      }
    });
  }
});
