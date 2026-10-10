import { expect, test } from "@playwright/test";

test("public header replaces the search link, opens recommendations, and submits bilingual searches", async ({ page }) => {
  test.setTimeout(120_000);
  for (const locale of ["zh", "en"] as const) {
    const english = locale === "en";
    for (const width of [1920, 1440, 1280, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(english ? "/en" : "/");
      const header = page.locator(".redesign-header");
      const input = header.getByRole("combobox");
      await expect(input).toBeVisible();
      await expect(header.locator(".redesign-brand-label")).toHaveCount(0);
      await expect(header.locator('.redesign-nav-link[href$="/search"]')).toHaveCount(0);
      await expect(page.locator(".redesign-home-cta")).toHaveCSS("border-radius", "4px");
      await expect(header.locator(".redesign-language-switch:visible")).toHaveCSS("border-width", "0px");
      if (width >= 768) await expect(header.locator(".redesign-login-link:visible")).toHaveCSS("border-width", "0px");
      await expect(header.locator(".redesign-language-switch:visible")).toHaveCSS("background-color", "rgb(4, 98, 194)");
      await expect(header.locator(".redesign-language-link:visible").first()).toHaveCSS("color", "rgb(255, 255, 255)");
      const footer = page.locator(".redesign-footer");
      await expect(footer).toHaveCSS("background-color", "rgb(13, 58, 109)");
      await expect(footer.locator("h3").first()).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(footer.locator("nav").first()).toHaveCSS("background-color", "rgb(13, 58, 109)");
      await expect(footer.locator(".footer-brand-logo")).toHaveCSS("filter", "brightness(0) invert(1)");
      await expect(footer.locator(".footer-bottom")).toHaveCSS("justify-content", "center");
      await expect(footer.locator(".footer-bottom p")).toHaveCount(1);
      await expect(footer.locator(".footer-bottom p")).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(page.locator("main .redesign-home-brand-value")).toHaveCount(0);
      await expect(footer.locator(".redesign-home-brand-value-cta")).toHaveAttribute("href", english ? "/en/software" : "/software");
      await expect(footer.locator(".redesign-home-brand-value-inner h2")).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(footer.locator(".redesign-home-brand-value")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(footer.locator(".footer-navigation")).toHaveCSS("justify-content", "flex-end");
      const ctaCentered = await footer.evaluate((element) => {
        const area = element.querySelector(".redesign-home-brand-value")!.getBoundingClientRect();
        const cta = element.querySelector(".redesign-home-brand-value-cta")!.getBoundingClientRect();
        return Math.abs(area.left + area.width / 2 - cta.left - cta.width / 2);
      });
      expect(ctaCentered).toBeLessThan(2);
      if (width >= 1280) {
        const logoCenterOffset = await footer.evaluate((element) => {
          const logo = element.querySelector<HTMLElement>(".footer-brand-logo")!.getBoundingClientRect();
          const grid = element.querySelector<HTMLElement>(".footer-grid")!.getBoundingClientRect();
          return Math.abs(logo.top + logo.height / 2 - (grid.top + grid.height / 2));
        });
        expect(logoCenterOffset).toBeLessThanOrEqual(1);
        const layout = await footer.evaluate((element) => {
          const logo = element.querySelector(".footer-brand-logo")!.getBoundingClientRect();
          const value = element.querySelector(".redesign-home-brand-value")!.getBoundingClientRect();
          const menus = element.querySelector(".footer-navigation")!.getBoundingClientRect();
          return { logoLeft: logo.left, logoRight: logo.right, valueLeft: value.left, valueRight: value.right, valueCenter: value.left + value.width / 2, menusLeft: menus.left };
        });
        expect(Math.abs(layout.valueCenter - width / 2)).toBeLessThan(2);
        expect(layout.logoRight).toBeLessThan(layout.valueLeft);
        expect(layout.valueRight).toBeLessThan(layout.menusLeft);
        if (width === 1920) expect(layout.logoLeft).toBe((width - 1200) / 2 - 240);
      }
      for (const selector of [".redesign-home-product-autoplay", ".redesign-home-reviews-rotation"]) {
        const rotationButton = page.locator(selector);
        await expect(rotationButton).toHaveCSS("color", "rgb(0, 0, 0)");
        await expect(rotationButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await rotationButton.hover();
        await expect(rotationButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await page.mouse.move(0, 0);
      }
      await expect(page.locator(".redesign-home-brand-value-inner h2")).toHaveCSS("font-weight", "700");
      if ([1920, 1440, 390].includes(width)) {
        await footer.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `output/ui-followup/footer-center-${locale}-${width}.png` });
        await header.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `output/ui-followup/compact-header-${width}.png` });
      }
      const layout = await header.evaluate((el) => {
        const box = (selector: string) => el.querySelector(selector)!.getBoundingClientRect().toJSON();
        return { logo: box(".redesign-brand-mark"), search: box(".redesign-header-search"), nav: box(".redesign-desktop-nav"), scrollWidth: document.documentElement.scrollWidth };
      });
      expect(layout.logo.width).toBe(154);
      expect(layout.scrollWidth).toBeLessThanOrEqual(width);
      const searchRatio = await input.evaluate((element) => {
        const form = element.closest(".redesign-header-search")!;
        const inner = form.parentElement!;
        const columns = getComputedStyle(inner).gridTemplateColumns.split(" ").map(parseFloat);
        return form.getBoundingClientRect().width / (columns.length === 3 ? columns[1] : inner.clientWidth);
      });
      expect(searchRatio).toBeCloseTo(width >= 768 ? 0.5 : 1, 1);
      if (width >= 1280) {
        expect(layout.search.x).toBeGreaterThanOrEqual(layout.logo.right);
        expect(layout.search.right).toBeLessThanOrEqual(layout.nav.x + 1);
      } else {
        expect(layout.search.top).toBeGreaterThanOrEqual(layout.logo.bottom);
      }
      await input.click();
      const panel = page.getByRole("dialog", { name: english ? "Most downloaded" : "下载最多的产品" });
      await expect(panel).toBeVisible();
      await expect(input).toBeFocused();
      await expect(panel).toContainText(english ? "not available yet" : "暂无下载推荐");
      await input.press("Escape");
      await expect(panel).not.toBeVisible();
      await input.click();
      await expect(panel).toBeVisible();
      await page.locator(".redesign-home-hero h1").click();
      await expect(panel).not.toBeVisible();
    }
    const input = page.locator(".redesign-header").getByRole("combobox");
    await input.fill("AI 视频");
    await input.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${english ? "/en" : ""}/search\\?q=AI\\+%E8%A7%86%E9%A2%91`));
  }
});

test("download recommendations support keyboard and product navigation", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "1", "The fixture is development-only.");
  await page.context().addCookies([{ name: "enhe_locale", value: "en", url: `http://127.0.0.1:${process.env.PORT ?? "3000"}/` }]);
  await page.goto("/redesign-preview/home");
  const input = page.locator(".redesign-header").getByRole("combobox");
  await input.click();
  const panel = page.getByRole("dialog", { name: "Most downloaded" });
  const links = panel.getByRole("link");
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toContainText("120 downloads");
  await expect(links.nth(1)).toContainText("60 downloads");
  await input.press("ArrowDown");
  await expect(links.first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(links.nth(1)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(input).toBeFocused();
  await input.click();
  await links.nth(1).click();
  await expect(page).toHaveURL(/\/en\/ai-skills\/preview-skill$/);
});
