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
      await expect(page.locator(".redesign-home-cta").first()).toHaveCSS("border-radius", "12px");
      await expect(header.locator(".redesign-language-switch:visible")).toHaveCSS("border-width", "0px");
      if (width >= 768) await expect(header.locator(".redesign-login-link:visible")).toHaveCSS("border-width", "0px");
      await expect(header.locator(".redesign-language-switch:visible")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(header.locator('.squish-switch:visible')).toHaveAttribute("aria-checked", english ? "true" : "false");
      const footer = page.locator(".redesign-footer");
      await expect(footer).toHaveCSS("background-color", "rgb(13, 58, 109)");
      await expect(footer.locator("h3").first()).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(footer.locator("nav").first()).toHaveCSS("background-color", "rgb(13, 58, 109)");
      await expect(footer.locator(".footer-brand-logo")).toHaveCSS("filter", "brightness(0) invert(1)");
      await expect(footer.locator(".footer-brand-logo")).toHaveAttribute("src", /enhe-footer-wordmark\.png/);
      await expect(footer.locator(".footer-bottom")).toHaveCSS("justify-content", "center");
      await expect(footer.locator(".footer-bottom p")).toHaveCount(1);
      await expect(footer.locator(".footer-bottom p")).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(page.locator("main .redesign-home-brand-value")).toHaveCount(0);
      await expect(footer.locator(".redesign-home-brand-value-cta")).toHaveCount(0);
      await expect(footer.locator(".redesign-home-brand-value-inner h2")).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(footer.locator(".redesign-home-brand-value")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(footer.locator(".footer-navigation")).toHaveCSS("justify-content", width < 768 ? "center" : "flex-end");
      if (width >= 1280) {
        const logoPositionError = await footer.evaluate((element) => {
          const logo = element.querySelector<HTMLElement>(".footer-brand-logo")!.getBoundingClientRect();
          const grid = element.querySelector<HTMLElement>(".footer-grid")!.getBoundingClientRect();
          return Math.abs(logo.top + logo.height / 2 - (grid.top + grid.height / 2) - logo.height * 0.1);
        });
        expect(logoPositionError).toBeLessThanOrEqual(1);
        const layout = await footer.evaluate((element) => {
          const logo = element.querySelector(".footer-brand-logo")!.getBoundingClientRect();
          const value = element.querySelector(".redesign-home-brand-value")!.getBoundingClientRect();
          const menus = element.querySelector(".footer-navigation")!.getBoundingClientRect();
          return { logoLeft: logo.left, logoRight: logo.right, valueLeft: value.left, valueRight: value.right, valueCenter: value.left + value.width / 2, menusLeft: menus.left };
        });
        expect(Math.abs(layout.valueCenter - width / 2)).toBeLessThan(2);
        expect(layout.logoRight).toBeLessThan(layout.valueLeft);
        expect(layout.valueRight).toBeLessThan(layout.menusLeft);
        if (width === 1920) expect(Math.abs(layout.logoLeft - ((width - 1200) / 2 - 240))).toBeLessThan(1);
      }
      await expect(page.locator(".redesign-home-reviews-rotation")).toBeHidden();
      const heroTitleWeight = await page.locator(".redesign-home-hero .masked-heading").first().evaluate((element) => getComputedStyle(element).fontWeight);
      await expect(page.locator(".redesign-home-brand-value-inner h2")).toHaveCSS("font-weight", heroTitleWeight);
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
      expect(layout.logo.width).toBe(width < 420 ? 120 : 154);
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
      // The compact hero can sit behind the search panel; use a genuine outside point.
      await page.locator(".redesign-home-feature-folder").first().click({ position: { x: 1, y: 1 } });
      await expect(panel).not.toBeVisible();
    }
    const input = page.locator(".redesign-header").getByRole("combobox");
    await input.fill("AI 视频");
    await input.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${english ? "/en" : ""}/search\\?q=AI\\+%E8%A7%86%E9%A2%91`));
  }
});

test("homepage header brand and search align with the software catalog content edge", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });

  await page.goto("/software");
  const catalogContentLeft = await page.locator(".redesign-software-page").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left + Number.parseFloat(getComputedStyle(element).paddingLeft);
  });

  await page.goto("/");
  const headerPositions = await page.locator(".redesign-header[data-home='true']").evaluate((header) => {
    const brand = header.querySelector<HTMLElement>(".redesign-brand-mark")!.getBoundingClientRect();
    const search = header.querySelector<HTMLElement>(".redesign-header-search")!.getBoundingClientRect();
    return { brandLeft: brand.left, brandRight: brand.right, searchLeft: search.left };
  });

  expect(Math.abs(headerPositions.brandLeft - catalogContentLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(headerPositions.searchLeft - headerPositions.brandRight - 16)).toBeLessThanOrEqual(1);
});

test("footer restores the original ENHE wordmark and white treatment", async ({ page }) => {
  await page.goto("/");
  const logo = page.locator(".redesign-footer .footer-brand-logo");
  await expect(logo).toHaveAttribute("src", /enhe-footer-wordmark\.png/);
  await expect(logo).toHaveAttribute("alt", "ENHE 品牌标志");
  await expect(logo).toHaveCSS("filter", "brightness(0) invert(1)");
  await expect(logo).toHaveCSS("mix-blend-mode", "normal");
});

test("non-home buttons and dropdowns are pill shaped while homepage controls keep their existing shape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("/");
  await expect(page.locator(".redesign-header[data-home='true'] button.redesign-nav-link").first()).toHaveCSS("border-radius", "4px");
  await expect(page.locator(".redesign-home-cta").first()).toHaveCSS("border-radius", "12px");

  await page.goto("/register");
  await expect(page.locator(".redesign-header:not([data-home='true']) button.redesign-nav-link").first()).toHaveCSS("border-radius", "999px");
  await expect(page.locator("#register-gender")).toHaveCSS("border-radius", "999px");
});

test("public search fields use the homepage capsule outline and news filtering stays compact", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  const routeSearches = [
    ["/software", "#software-search"],
    ["/ai-skills", "#ai-skills-search"],
    ["/account-services", "#account-services-search"],
    ["/skill-learning", "#skill-learning-search"],
    ["/online-tools", "#online-tools-search"],
    ["/ai-workflows", 'input[name="q"]'],
    ["/search", ".public-search-form"],
    ["/build-your-own-x", ".byox-search"],
  ] as const;

  for (const [route, selector] of routeSearches) {
    await page.goto(route);
    await expect(page.locator(".redesign-header-search input")).toHaveCSS("border-radius", "999px");
    const routeSearch = page.locator(selector).first();
    if (await routeSearch.count() === 0) {
      await expect(page.locator("main")).toContainText(/待核验|内容准备中|当前本地预览/);
      continue;
    }
    await expect(routeSearch).toHaveCSS("border-radius", "999px");
  }

  await page.goto("/ai-news");
  const newsSearch = page.locator("#ai-news-search");
  if (await newsSearch.count() === 0) {
    await expect(page.getByRole("heading", { name: "内容准备中" })).toBeVisible();
    return;
  }

  const filterForm = page.locator(".ai-news-filter-surface");
  const filterButton = filterForm.locator("button.ai-news-filter-control");
  await expect(filterButton).toHaveCSS("width", "132px");
  await expect(filterButton).toHaveCSS("border-radius", "999px");
  const filterPrecedesSearch = await filterForm.evaluate((form) => {
    const buttonIndex = Array.from(form.children).findIndex((element) => element.matches("button"));
    const inputIndex = Array.from(form.children).findIndex((element) => element.querySelector("#ai-news-search"));
    return buttonIndex >= 0 && inputIndex > buttonIndex;
  });
  expect(filterPrecedesSearch).toBe(true);
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
