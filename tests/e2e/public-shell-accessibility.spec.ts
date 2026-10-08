import { expect, test } from "@playwright/test";

const routes = [
  { path: "/software", locale: "zh", menu: "菜单", home: "ENHE AI 首页" },
  { path: "/en/software", locale: "en", menu: "Menu", home: "ENHE AI home" },
  { path: "/ai-news", locale: "zh", menu: "菜单", home: "ENHE AI 首页" },
  { path: "/en/ai-news", locale: "en", menu: "Menu", home: "ENHE AI home" },
] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
});

for (const route of [
  { path: "/ai-skills", menu: "菜单", href: "/ai-skills", label: "AI Skill" },
  { path: "/en/ai-skills", menu: "Menu", href: "/en/ai-skills", label: "AI Skills" },
] as const) {
  test(`${route.path} marks only one current page in desktop and mobile navigation`, async ({
    page,
  }) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route.path, { waitUntil: "load" });
      expect(response?.status()).toBe(200);

      let nav;
      if (width < 768) {
        await page.getByRole("button", { name: route.menu, exact: true }).click();
        const drawer = page.locator(".redesign-mobile-drawer");
        await expect(drawer).toBeVisible();
        nav = drawer.locator(".redesign-mobile-nav");
      } else {
        nav = page.locator(".redesign-desktop-nav");
      }

      if (width < 768) {
        const currentLinks = nav.locator('[aria-current="page"]');
        await expect(currentLinks).toHaveCount(1);
        await expect(currentLinks.first()).toHaveAttribute("href", route.href);
      } else {
        const currentTrigger = nav.locator('.redesign-nav-link[aria-current="page"]');
        await expect(currentTrigger).toHaveCount(1);
        await expect(currentTrigger).toHaveText(route.label);
      }
    }
  });
}

for (const route of routes) {
  test(`${route.path} moves keyboard focus through the localized skip link`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route.path, { waitUntil: "load" });

    expect(response?.status()).toBe(200);
    await page.keyboard.press("Tab");

    const skipLink = page.locator(".redesign-skip-link");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await expect(skipLink).toHaveText(
      route.locale === "en" ? "Skip to main content" : "跳到主要内容",
    );

    const mainContent = page.locator("#main-content");
    expect(await mainContent.count()).toBe(1);
    await expect(mainContent).toHaveAttribute("tabindex", "-1");

    await page.keyboard.press("Enter");
    await expect(mainContent).toBeFocused();
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test(`${route.path} exposes current navigation and a named home link`, async ({
    page,
  }) => {
    test.skip(route.path.includes("/ai-news"), "AI News uses workspace navigation; its route checks live in the dedicated workspace suite.");

    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto(route.path, { waitUntil: "load" });

    expect(response?.status()).toBe(200);
    await expect(page.locator(".redesign-desktop-nav")).toBeVisible();
    await expect(
      page.locator('.redesign-desktop-nav a.redesign-nav-link[aria-current="page"]'),
    ).toHaveAttribute("href", route.path);
    await expect(page.locator(".redesign-brand-lockup")).toHaveAttribute(
      "aria-label",
      route.home,
    );
    await expect(page.locator(".redesign-brand-lockup")).toHaveAttribute(
      "href",
      route.locale === "en" ? "/en" : "/",
    );
  });

  test(`${route.path} keeps the mobile drawer keyboard-accessible`, async ({
    page,
  }) => {
    test.skip(route.path.includes("/ai-news"), "AI News uses a compact workspace navigation instead of the site-wide drawer.");

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route.path, { waitUntil: "load" });

    expect(response?.status()).toBe(200);
    const trigger = page.getByRole("button", { name: route.menu, exact: true });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveAttribute("aria-controls", /.+/);
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox?.width, `${route.path} menu trigger width`).toBeGreaterThanOrEqual(48);
    expect(triggerBox?.height, `${route.path} menu trigger height`).toBeGreaterThanOrEqual(48);
    await trigger.click();

    const drawer = page.locator(".redesign-mobile-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("role", "dialog");
    await expect(drawer).toHaveAttribute("aria-modal", "true");
    await expect(drawer).toHaveAttribute("aria-label", route.menu);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );
    await expect(drawer.locator('a[aria-current="page"]')).toHaveAttribute(
      "href",
      route.path,
    );

    const overlay = page.locator(".redesign-menu-overlay");
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(await overlay.evaluate((element) => element.tagName)).toBe("DIV");
    expect(await overlay.getAttribute("tabindex")).toBeNull();

    const focusables = drawer.locator(
      'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusables.first();
    const lastFocusable = focusables.last();
    await lastFocusable.focus();
    await page.keyboard.press("Tab");
    await expect(firstFocusable).toBeFocused();
    await firstFocusable.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(lastFocusable).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  });
}

for (const width of [320, 390, 480, 768, 1024, 1440]) {
  test(`DB-free bilingual shell has no horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    for (const path of [
      "/software",
      "/en/software",
      "/ai-news",
      "/en/ai-news",
    ]) {
      const response = await page.goto(path, { waitUntil: "load" });
      expect(response?.status(), `${path} at ${width}px`).toBe(200);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBe(0);
    }

    expect(pageErrors).toEqual([]);
  });
}
