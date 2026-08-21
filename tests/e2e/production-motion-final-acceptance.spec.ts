import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

import { HOME_PRODUCTS } from "@/lib/redesign/home/home-products";

type Modality = "keyboard" | "pointer" | "reduced";
type FormalRoute = {
  closeCategory?: string;
  closeMenu: string;
  h1: RegExp;
  kind: "home" | "software";
  menu: string;
  next?: string;
  path: string;
  previous?: string;
  support: string;
};

const viewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 483, height: 900 },
  { width: 484, height: 900 },
  { width: 767, height: 900 },
  { width: 768, height: 900 },
  { width: 769, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
] as const;

const modalities = ["pointer", "keyboard", "reduced"] as const;

const routes: FormalRoute[] = [
  {
    path: "/",
    kind: "home",
    h1: /一站式AI平台/,
    menu: "菜单",
    closeMenu: "收起菜单",
    support: "客服",
    previous: "上一款产品",
    next: "下一款产品",
  },
  {
    path: "/en",
    kind: "home",
    h1: /The All-in-One AI Platform\./i,
    menu: "Menu",
    closeMenu: "Close menu",
    support: "Chat",
    previous: "Previous product",
    next: "Next product",
  },
  {
    path: "/software",
    kind: "software",
    h1: /AI工具/,
    menu: "菜单",
    closeMenu: "收起菜单",
    closeCategory: "关闭分类",
    support: "客服",
  },
  {
    path: "/en/software",
    kind: "software",
    h1: /AI Tools/i,
    menu: "Menu",
    closeMenu: "Close menu",
    closeCategory: "Close categories",
    support: "Chat",
  },
];

const productIds = [
  "ultimate-edition",
  "infinitetalk",
  "ai-voice",
  "lumi-os",
  "faceswap-studio",
] as const;

const homeSsrRoutes = [
  {
    path: "/",
    locale: "zh",
    h1: routes[0].h1,
    cta: "查看产品 →",
    next: "下一款产品",
  },
  {
    path: "/en",
    locale: "en",
    h1: routes[1].h1,
    cta: "View product →",
    next: "Next product",
  },
] as const;

const homeSsrViewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 },
] as const;

const categorySupportRoutes = [
  { path: "/software", otherPath: "/about", support: "客服" },
  { path: "/en/software", otherPath: "/en/about", support: "Chat" },
] as const;

const categorySupportViewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 483, height: 900 },
  { width: 484, height: 900 },
  { width: 767, height: 900 },
] as const;

function monitorErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

function monitorHomeProductMediaRequests(page: Page) {
  const productMediaRequests: string[] = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (
      request.resourceType() === "image" &&
      HOME_PRODUCTS.some((product) => product.mediaSrc === pathname)
    ) {
      productMediaRequests.push(pathname);
    }
  });
  return productMediaRequests;
}

async function openFormalRoute(page: Page, route: string) {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${route} response status`).toBe(200);
}

async function rootOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

const focusableSelector = [
  "a[href]:visible",
  "button:not([disabled]):visible",
  "input:not([disabled]):visible",
  "select:not([disabled]):visible",
  "textarea:not([disabled]):visible",
  '[tabindex]:not([tabindex="-1"]):visible',
].join(", ");

async function expectFocusTrap(page: Page, modal: Locator) {
  const focusables = modal.locator(focusableSelector);
  const count = await focusables.count();
  expect(count).toBeGreaterThan(1);

  await focusables.last().focus();
  await page.keyboard.press("Tab");
  await expect(focusables.first()).toBeFocused();
  await focusables.first().focus();
  await page.keyboard.press("Shift+Tab");
  await expect(focusables.last()).toBeFocused();
}

function intersectionArea(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  const overlapX = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x),
  );
  const overlapY = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y),
  );
  return overlapX * overlapY;
}

type SupportBox = { x: number; y: number; width: number; height: number };

async function captureSupportBaseline(
  page: Page,
  accessibleName: string,
): Promise<SupportBox> {
  const launcher = page.getByRole("button", {
    name: accessibleName,
    exact: true,
  });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute("tabindex", "0");
  const box = await launcher.boundingBox();
  expect(box).not.toBeNull();
  return box ?? { x: 0, y: 0, width: 0, height: 0 };
}

async function expectSupportSuppressed(
  page: Page,
  accessibleName: string,
  baseline: SupportBox,
  panel: Locator,
) {
  const widget = page.locator('.customer-support-widget[data-support-open="false"]');
  const launcher = page.locator(".customer-support-launcher");

  await expect(widget).toHaveCSS("display", "none");
  await expect(launcher).toBeHidden();
  const supportBox = await launcher.boundingBox();
  expect(supportBox).toBeNull();
  await expect(
    page.getByRole("button", { name: accessibleName, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: accessibleName,
      exact: true,
      includeHidden: true,
    }),
  ).toHaveCount(1);
  expect(
    await launcher.evaluate((element) => {
      (element as HTMLElement).focus();
      return document.activeElement === element;
    }),
  ).toBe(false);

  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(
    supportBox
      ? intersectionArea(
          supportBox,
          panelBox ?? { x: 0, y: 0, width: 0, height: 0 },
        )
      : 0,
  ).toBe(0);
  expect(
    await page.evaluate(({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      return {
        category: Boolean(
          target?.closest(
            ".redesign-software-category-overlay, .redesign-software-category-panel",
          ),
        ),
        support: Boolean(target?.closest(".customer-support-widget")),
      };
    }, {
      x: baseline.x + baseline.width / 2,
      y: baseline.y + baseline.height / 2,
    }),
  ).toEqual({ category: true, support: false });
}

async function expectSupportRestored(
  page: Page,
  accessibleName: string,
  baseline: SupportBox,
) {
  const launcher = page.getByRole("button", {
    name: accessibleName,
    exact: true,
  });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute("tabindex", "0");
  const box = await launcher.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x).toBeCloseTo(baseline.x, 1);
  expect(box?.y).toBeCloseTo(baseline.y, 1);
  expect(box?.width).toBeCloseTo(baseline.width, 1);
  expect(box?.height).toBeCloseTo(baseline.height, 1);
  await launcher.focus();
  await expect(launcher).toBeFocused();
}

async function expectSupportClearOf(
  page: Page,
  support: Locator,
  selector: string,
  label: string,
) {
  const target = page.locator(selector).first();
  await expect(target, label).toBeVisible();
  await target.evaluate((element) =>
    element.scrollIntoView({ block: "end", inline: "nearest" }),
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );

  const supportBox = await support.boundingBox();
  const targetBoxes = await page.locator(selector).evaluateAll((elements) =>
    elements.flatMap((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
        ? [{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }]
        : [];
    }),
  );
  expect(supportBox, `${label} support box`).not.toBeNull();
  expect(targetBoxes.length, `${label} visible target count`).toBeGreaterThan(0);
  for (const targetBox of targetBoxes) {
    expect(
      intersectionArea(supportBox ?? { x: 0, y: 0, width: 0, height: 0 }, targetBox),
      `${label} support intersection`,
    ).toBe(0);
  }
}

function currentProduct(page: Page) {
  return page.locator('[data-product-current="true"]');
}

async function waitForRelevantAnimations(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            "[data-product-layer], .redesign-software-category-panel, .redesign-software-category-overlay, .redesign-mobile-drawer, .redesign-menu-overlay",
          ),
        ).filter((element) =>
          element
            .getAnimations()
            .some((animation) =>
              ["pending", "running"].includes(animation.playState),
            ),
        ).length,
      ),
    )
    .toBe(0);
}

async function openCategory(
  page: Page,
  modality: Modality,
  width: number,
) {
  const trigger = page.locator(".redesign-software-category-trigger");
  if (modality === "keyboard") {
    await trigger.focus();
    await trigger.press("Enter");
  } else {
    await trigger.click();
  }

  const panel = page.locator(".redesign-software-category-panel");
  const expectedDuration =
    modality === "reduced"
      ? "80"
      : modality === "keyboard"
        ? "100"
        : width < 768
          ? "230"
          : "190";
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-motion-variant", "origin-aware-layer");
  await expect(panel).toHaveAttribute("data-motion-duration-ms", expectedDuration);
  await expect(panel).toHaveAttribute(
    "data-motion-modality",
    modality === "reduced" ? "reduced" : modality,
  );
  await expect(panel).toHaveAttribute(
    "data-motion-enter-transform",
    modality === "pointer"
      ? width < 768
        ? "translateY(12px) scale(1)"
        : "translateY(4px) scale(0.98)"
      : "none",
  );
  await expect(panel.locator(".redesign-software-category-button")).toHaveCount(7);
  return { panel, trigger };
}

async function closeCategory(page: Page, panel: Locator, trigger: Locator) {
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
}

async function openMobileMenu(
  page: Page,
  route: FormalRoute,
  modality: Modality,
) {
  const trigger = page.getByRole("button", { name: route.menu, exact: true });
  if (modality === "keyboard") {
    await trigger.focus();
    await trigger.press("Enter");
  } else {
    await trigger.click();
  }

  const drawer = page.locator(".redesign-mobile-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute("role", "dialog");
  await expect(drawer).toHaveAttribute("aria-modal", "true");
  await expect(drawer).toHaveAttribute("data-motion-variant", "directional-drawer");
  await expect(drawer).toHaveAttribute(
    "data-motion-duration-ms",
    modality === "pointer" ? "230" : modality === "keyboard" ? "100" : "80",
  );
  await expect(drawer).toHaveAttribute(
    "data-motion-properties",
    modality === "pointer" ? "transform" : "opacity",
  );
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  return { drawer, trigger };
}

async function closeMobileMenu(
  page: Page,
  drawer: Locator,
  trigger: Locator,
) {
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
}

async function exerciseHome(
  page: Page,
  route: FormalRoute,
  modality: Modality,
) {
  const stage = page.locator(".redesign-home-product-stage");
  await stage.scrollIntoViewIfNeeded();
  await expect(currentProduct(page)).toHaveAttribute(
    "data-product-id",
    "ultimate-edition",
  );

  if (modality === "keyboard") {
    await stage.focus();
    await stage.press("ArrowRight");
  } else {
    await page.getByRole("button", { name: route.next }).click();
  }

  await expect(stage).toHaveAttribute("data-motion-variant", "directional-slide");
  await expect(stage).toHaveAttribute(
    "data-motion-duration-ms",
    modality === "pointer" ? "240" : modality === "keyboard" ? "0" : "80",
  );
  await expect(stage).toHaveAttribute(
    "data-motion-enter-transform",
    modality === "pointer" ? "translateX(12px)" : "none",
  );
  await expect(currentProduct(page)).toHaveAttribute("data-product-id", "infinitetalk");
  await expect(stage.locator('[aria-selected="true"]')).toHaveCount(0);
  await expect(
    page.locator('.redesign-home-product-counter[aria-live="polite"][aria-atomic="true"]'),
  ).toHaveCount(1);
}

async function exerciseSoftware(
  page: Page,
  modality: Modality,
  width: number,
) {
  const { panel, trigger } = await openCategory(page, modality, width);
  if (width < 768) {
    await expect(panel).toHaveAttribute("aria-modal", "true");
  } else {
    await expect(panel).not.toHaveAttribute("aria-modal", "true");
  }
  await expect(panel.locator("[aria-selected]")).toHaveCount(0);
  await closeCategory(page, panel, trigger);
}

for (const route of routes) {
  for (const viewport of viewports) {
    for (const modality of modalities) {
      test(`final matrix ${route.path} ${viewport.width}px ${modality}`, async ({
        page,
      }) => {
        const errors = monitorErrors(page);
        await page.emulateMedia({
          reducedMotion: modality === "reduced" ? "reduce" : "no-preference",
        });
        await page.setViewportSize(viewport);
        await openFormalRoute(page, route.path);

        await expect(page.getByRole("heading", { level: 1, name: route.h1 })).toBeVisible();
        expect(await rootOverflow(page), `${route.path} root overflow`).toBe(0);

        const support = page.getByRole("button", {
          name: route.support,
          exact: true,
        });
        await expect(support).toBeVisible();
        const supportBox = await support.boundingBox();
        expect(supportBox).not.toBeNull();
        const supportReserve = await page
          .locator(".enhe-redesign-production")
          .evaluate((element) =>
            getComputedStyle(element)
              .getPropertyValue("--support-exclusion-current")
              .trim(),
          );
        expect(supportReserve).toBe(
          viewport.width <= 483 ? "52px" : "104px",
        );
        const supportLabel = support.locator(".customer-support-launcher-label");
        if (viewport.width <= 483) {
          expect(supportBox?.width).toBe(44);
          expect(supportBox?.height).toBe(44);
          await expect(supportLabel).toBeHidden();
        } else {
          expect(supportBox?.width ?? 0).toBeGreaterThan(44);
          await expect(supportLabel).toBeVisible();
        }

        if (route.kind === "home") {
          await exerciseHome(page, route, modality);
        } else {
          await exerciseSoftware(page, modality, viewport.width);
        }

        if (viewport.width < 768) {
          const menuTrigger = page.locator(".redesign-menu-trigger");
          await menuTrigger.scrollIntoViewIfNeeded();
          await expect(menuTrigger).toBeVisible();
          const menuBox = await menuTrigger.boundingBox();
          expect(menuBox).not.toBeNull();
          const menuOwnsHit = await page.evaluate(({ x, y }) => {
            const target = document.elementFromPoint(x, y);
            return Boolean(target?.closest(".redesign-menu-trigger"));
          }, {
            x: (menuBox?.x ?? 0) + (menuBox?.width ?? 0) / 2,
            y: (menuBox?.y ?? 0) + (menuBox?.height ?? 0) / 2,
          });
          expect(menuOwnsHit).toBe(true);

          const { drawer, trigger } = await openMobileMenu(page, route, modality);
          await expect(drawer.locator("[aria-selected]")).toHaveCount(0);
          const openSupportBox = await support.boundingBox();
          expect(openSupportBox).not.toBeNull();
          const navigationOwnsSupportHit = await page.evaluate(({ x, y }) => {
            const target = document.elementFromPoint(x, y);
            return Boolean(
              target?.closest(".redesign-mobile-drawer, .redesign-menu-overlay"),
            );
          }, {
            x: (openSupportBox?.x ?? 0) + (openSupportBox?.width ?? 0) / 2,
            y: (openSupportBox?.y ?? 0) + (openSupportBox?.height ?? 0) / 2,
          });
          expect(navigationOwnsSupportHit).toBe(true);
          await closeMobileMenu(page, drawer, trigger);
        } else {
          await expect(page.locator(".redesign-menu-trigger")).toBeHidden();
          await expect(page.locator(".redesign-desktop-nav")).toBeVisible();
          await expect(page.locator(".redesign-mobile-drawer")).toHaveCount(0);
        }

        await waitForRelevantAnimations(page);
        expect(await rootOverflow(page), `${route.path} final root overflow`).toBe(0);
        expect(errors.consoleErrors).toEqual([]);
        expect(errors.pageErrors).toEqual([]);
      });
    }
  }
}

for (const supportWidth of [483, 484] as const) {
  test(`support exclusions keep formal controls clear at ${supportWidth}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: supportWidth, height: 844 });

    for (const route of routes) {
      await openFormalRoute(page, route.path);
      const support = page.getByRole("button", {
        name: route.support,
        exact: true,
      });
      await expect(support).toBeVisible();
      const targets =
        route.kind === "home"
          ? [
              ".redesign-home-cta",
              ".redesign-home-product-control",
              ".redesign-home-brand-value-cta",
              "footer a",
            ]
          : [
              '[data-section="all-products"] .redesign-software-card-link',
              '.redesign-software-load-row a[rel="next"]',
              "footer a",
            ];

      for (const selector of targets) {
        await expectSupportClearOf(
          page,
          support,
          selector,
          `${route.path} ${supportWidth}px ${selector}`,
        );
      }
      expect(
        await rootOverflow(page),
        `${route.path} ${supportWidth}px support root overflow`,
      ).toBe(0);
    }
  });
}

for (const route of routes) {
  test(`SSR without JavaScript keeps core content on ${route.path}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: route.h1 })).toBeVisible();
    await expect(page.locator(".redesign-desktop-nav a[href]")).not.toHaveCount(0);

    if (route.kind === "home") {
      const html = await page.content();
      const productMarkers = productIds.map(
        (productId) => `data-product-id="${productId}"`,
      );
      const missingProductIds = productIds.filter(
        (_productId, index) => !html.includes(productMarkers[index]),
      );
      expect(missingProductIds, `${route.path} missing SSR product IDs`).toEqual([]);
      expect(productMarkers.map((marker) => html.indexOf(marker))).toEqual(
        [...productMarkers]
          .map((marker) => html.indexOf(marker))
          .sort((left, right) => left - right),
      );
      await expect(currentProduct(page)).toHaveAttribute(
        "data-product-id",
        "ultimate-edition",
      );
      await expect(currentProduct(page)).toBeVisible();
      await expect(currentProduct(page).getByRole("link")).toBeVisible();
    } else {
      await expect(
        page.locator(".redesign-software-category-button"),
      ).toHaveCount(7);
      await expect(page.locator("[data-catalog-card]").first()).toBeVisible();
      await expect(page.locator('a[rel="next"]')).not.toHaveCount(0);
    }

    await context.close();
  });
}

for (const route of homeSsrRoutes) {
  for (const viewport of homeSsrViewports) {
    test(`home SSR fallback exposes canonical products on ${route.path} at ${viewport.width}px`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport,
      });
      const page = await context.newPage();
      const productMediaRequests = monitorHomeProductMediaRequests(page);
      await page.route("**/api/analytics", (request) =>
        request.fulfill({ status: 204 }),
      );
      const response = await page.goto(route.path, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);

      await expect(
        page.getByRole("heading", { level: 1, name: route.h1 }),
      ).toBeVisible();
      await expect(page.locator(".redesign-header")).toBeVisible();
      await expect(page.locator(".redesign-footer")).toBeVisible();

      const fallback = page.locator("noscript ol");
      const items = fallback.locator("li[data-product-id]");
      await expect(fallback).toBeVisible();
      await expect(items).toHaveCount(HOME_PRODUCTS.length);
      expect(await items.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-product-id")),
      )).toEqual(productIds);

      for (const [index, product] of HOME_PRODUCTS.entries()) {
        const item = items.nth(index);
        await expect(item).toHaveAttribute("data-product-id", product.id);
        await expect(
          item.getByRole("heading", {
            level: 3,
            name: product.name[route.locale],
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          item.getByText(product.description[route.locale], { exact: true }),
        ).toBeVisible();
        const cta = item.getByRole("link", { name: route.cta, exact: true });
        await expect(cta).toBeVisible();
        await expect(cta).toHaveAttribute(
          "href",
          product.detailHref[route.locale],
        );
      }

      await expect(fallback.locator("img, picture, source, video")).toHaveCount(0);
      await expect(currentProduct(page)).toHaveCount(1);
      await expect(currentProduct(page)).toHaveAttribute(
        "data-product-id",
        "ultimate-edition",
      );
      await expect(currentProduct(page)).toBeVisible();
      await expect(currentProduct(page).getByRole("link")).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect([...new Set(productMediaRequests)]).toEqual([
        HOME_PRODUCTS[0].mediaSrc,
      ]);
      expect(
        await page.locator("[id]").evaluateAll((elements) => {
          const ids = elements.map((element) => element.id);
          return ids.filter((id, index) => ids.indexOf(id) !== index);
        }),
      ).toEqual([]);
      expect(await rootOverflow(page)).toBe(0);
      await context.close();
    });
  }

  test(`home hydration keeps one interactive product surface on ${route.path}`, async ({
    page,
  }) => {
    const errors = monitorErrors(page);
    const hydrationMessages: string[] = [];
    const productMediaRequests = monitorHomeProductMediaRequests(page);
    page.on("console", (message) => {
      if (/hydration|hydrated|did not match/i.test(message.text())) {
        hydrationMessages.push(message.text());
      }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await openFormalRoute(page, route.path);

    await expect(page.locator("noscript li")).toHaveCount(0);
    expect(
      await page.locator("noscript").evaluate((element) => element.childElementCount),
    ).toBe(0);
    await expect(page.locator("[data-product-layer]:visible")).toHaveCount(1);
    await expect(
      page.locator(".redesign-home-product-stage a[href]:visible"),
    ).toHaveCount(1);
    await expect(currentProduct(page)).toHaveAttribute(
      "data-product-id",
      "ultimate-edition",
    );
    expect(
      await currentProduct(page)
        .locator(".redesign-home-product-media")
        .evaluate((element) => new URL((element as HTMLImageElement).src).pathname),
    ).toBe(HOME_PRODUCTS[0].mediaSrc);
    await page.waitForLoadState("networkidle");
    expect([...new Set(productMediaRequests)]).toEqual([
      HOME_PRODUCTS[0].mediaSrc,
    ]);

    await page.getByRole("button", { name: route.next, exact: true }).click();
    await expect(currentProduct(page)).toHaveAttribute(
      "data-product-id",
      "infinitetalk",
    );
    await waitForRelevantAnimations(page);
    expect(
      await page.locator("[id]").evaluateAll((elements) => {
        const ids = elements.map((element) => element.id);
        return ids.filter((id, index) => ids.indexOf(id) !== index);
      }),
    ).toEqual([]);
    expect(await rootOverflow(page)).toBe(0);
    expect(hydrationMessages).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
}

async function installModalMonitor(page: Page) {
  await page.evaluate(() => {
    const state = { maxDialogs: 0 };
    const sample = () => {
      const activeDialogs = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
      ).filter(
        (element) =>
          !element.hidden &&
          !element.inert &&
          element.getAttribute("aria-hidden") !== "true" &&
          getComputedStyle(element).display !== "none" &&
          getComputedStyle(element).visibility !== "hidden",
      ).length;
      state.maxDialogs = Math.max(state.maxDialogs, activeDialogs);
    };
    sample();
    new MutationObserver(sample).observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    (
      window as Window & {
        __enheFinalModalState?: typeof state;
      }
    ).__enheFinalModalState = state;
  });
}

async function modalMonitorState(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window & {
          __enheFinalModalState?: {
            maxDialogs: number;
          };
        }
      ).__enheFinalModalState ?? { maxDialogs: 0 },
  );
}

async function categoryClosingSuppressionSnapshot(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector(".redesign-software-category-layer");
    const widget = document.querySelector<HTMLElement>(
      '.customer-support-widget[data-support-open="false"]',
    );
    const launcher = document.querySelector<HTMLElement>(
      ".customer-support-launcher",
    );
    const rect = launcher?.getBoundingClientRect();
    return {
      layerRendered: root?.getAttribute("data-layer-rendered"),
      widgetDisplay: widget ? getComputedStyle(widget).display : null,
      launcherArea: rect ? rect.width * rect.height : 0,
    };
  });
}

for (const route of categorySupportRoutes) {
  for (const viewport of categorySupportViewports) {
    for (const modality of modalities) {
      test(`category support matrix ${route.path} ${viewport.width}px ${modality}`, async ({
        page,
      }) => {
        const errors = monitorErrors(page);
        await page.emulateMedia({
          reducedMotion: modality === "reduced" ? "reduce" : "no-preference",
        });
        await page.setViewportSize(viewport);
        await openFormalRoute(page, route.path);
        await installModalMonitor(page);

        const root = page.locator(".redesign-software-category-layer");
        const baseline = await captureSupportBaseline(page, route.support);
        const first = await openCategory(page, modality, viewport.width);
        await expect(root).toHaveAttribute("data-layer-rendered", "true");
        await expectSupportSuppressed(
          page,
          route.support,
          baseline,
          first.panel,
        );
        await expectFocusTrap(page, first.panel);
        expect(
          await page.locator('[role="dialog"][aria-modal="true"]:visible').count(),
        ).toBe(1);

        await page
          .locator(".redesign-software-category-overlay")
          .dispatchEvent("click", { detail: 1 });
        expect(await categoryClosingSuppressionSnapshot(page)).toEqual({
          layerRendered: "true",
          widgetDisplay: "none",
          launcherArea: 0,
        });
        await expect(first.panel).toBeHidden();
        await expect(root).toHaveAttribute("data-layer-rendered", "false");
        await expect(first.trigger).toBeFocused();
        await expectSupportRestored(page, route.support, baseline);

        const reopened = await openCategory(page, modality, viewport.width);
        await expectSupportSuppressed(
          page,
          route.support,
          baseline,
          reopened.panel,
        );
        await page.keyboard.press("Escape");
        expect(await categoryClosingSuppressionSnapshot(page)).toEqual({
          layerRendered: "true",
          widgetDisplay: "none",
          launcherArea: 0,
        });
        await expect(reopened.panel).toBeHidden();
        await expect(root).toHaveAttribute("data-layer-rendered", "false");
        await expect(reopened.trigger).toBeFocused();
        await expectSupportRestored(page, route.support, baseline);

        const beforeResize = await openCategory(page, modality, viewport.width);
        await expectSupportSuppressed(
          page,
          route.support,
          baseline,
          beforeResize.panel,
        );
        await page.setViewportSize({ width: 768, height: 900 });
        await expect(beforeResize.panel).toBeVisible();
        await expect(beforeResize.panel).not.toHaveAttribute("aria-modal", "true");
        const desktopSupport = await captureSupportBaseline(page, route.support);
        expect(desktopSupport.width).toBeGreaterThan(44);
        await expect
          .poll(() => page.evaluate(() => document.body.style.overflow))
          .toBe("");
        await page.keyboard.press("Escape");
        await expect(beforeResize.panel).toBeHidden();
        await expect(root).toHaveAttribute("data-layer-rendered", "false");
        await expectSupportRestored(page, route.support, desktopSupport);

        expect((await modalMonitorState(page)).maxDialogs).toBeLessThanOrEqual(1);
        expect(await rootOverflow(page)).toBe(0);
        expect(errors.consoleErrors).toEqual([]);
        expect(errors.pageErrors).toEqual([]);
      });
    }
  }

  test(`category support suppression cleans up on route unmount from ${route.path}`, async ({
    page,
  }) => {
    const errors = monitorErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openFormalRoute(page, route.path);
    const baseline = await captureSupportBaseline(page, route.support);
    const category = await openCategory(page, "keyboard", 390);
    await expectSupportSuppressed(
      page,
      route.support,
      baseline,
      category.panel,
    );

    await openFormalRoute(page, route.otherPath);
    await expect(page.locator(".redesign-software-category-layer")).toHaveCount(0);
    await expectSupportRestored(page, route.support, baseline);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
}

test("home product stage and mobile navigation preserve latest state across navigation", async ({
  page,
}) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");
  const stage = page.locator(".redesign-home-product-stage");
  const next = page.getByRole("button", { name: "下一款产品" });
  const previous = page.getByRole("button", { name: "上一款产品" });
  await stage.scrollIntoViewIfNeeded();

  await next.click();
  await next.click();
  await previous.click();
  await next.click();
  const menuTrigger = page.getByRole("button", { name: "菜单", exact: true });
  await menuTrigger.click();
  const drawer = page.locator(".redesign-mobile-drawer");
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await next.click();
  await expect(currentProduct(page)).toHaveAttribute("data-product-id", "lumi-os");
  await waitForRelevantAnimations(page);
  await expect(page.locator('[data-product-previous="true"]')).toHaveCount(0);

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/en"),
    page.locator('.redesign-mobile-actions .redesign-language-switch a[lang="en"]').click(),
  ]);
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/$/);
  await expect(currentProduct(page)).toHaveCount(1);
  await expect(currentProduct(page)).toHaveAttribute("data-product-id", "ultimate-edition");
  await expect(page.locator('[data-product-previous="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});

for (const locale of [
  {
    path: "/software",
    otherPath: "/about",
    menu: "菜单",
    support: "客服",
  },
  {
    path: "/en/software",
    otherPath: "/en/about",
    menu: "Menu",
    support: "Chat",
  },
] as const) {
  test(`software category and mobile navigation keep one active modal on ${locale.path}`, async ({
    page,
  }) => {
    const errors = monitorErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openFormalRoute(page, locale.path);
    await installModalMonitor(page);

    const category = await openCategory(page, "pointer", 390);
    await expectFocusTrap(page, category.panel);
    const blockedMenu = page.getByRole("button", {
      name: locale.menu,
      exact: true,
    });
    const blockedMenuBox = await blockedMenu.boundingBox();
    expect(blockedMenuBox).not.toBeNull();
    const categoryOwnsMenuHit = await page.evaluate(({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      return {
        category: Boolean(
          target?.closest(
            ".redesign-software-category-overlay, .redesign-software-category-panel",
          ),
        ),
        menu: Boolean(target?.closest(".redesign-menu-trigger")),
      };
    }, {
      x: (blockedMenuBox?.x ?? 0) + (blockedMenuBox?.width ?? 0) / 2,
      y: (blockedMenuBox?.y ?? 0) + (blockedMenuBox?.height ?? 0) / 2,
    });
    expect(categoryOwnsMenuHit).toEqual({ category: true, menu: false });
    await expect(blockedMenu).toHaveAttribute("aria-expanded", "false");
    await closeCategory(page, category.panel, category.trigger);
    await page.getByRole("button", { name: locale.menu, exact: true }).click();
    const drawer = page.locator(".redesign-mobile-drawer");
    await expect(drawer).toBeVisible();
    await expectFocusTrap(page, drawer);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    const modalState = await modalMonitorState(page);
    expect(modalState.maxDialogs).toBeLessThanOrEqual(1);

    await Promise.all([
      page.waitForURL((url) => url.pathname === locale.otherPath),
      drawer.locator(`a[href="${locale.otherPath}"]`).click(),
    ]);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`${locale.path.replaceAll("/", "\\/")}$`));

    const supportBaseline = await captureSupportBaseline(page, locale.support);
    const reopened = await openCategory(page, "keyboard", 390);
    await expectFocusTrap(page, reopened.panel);
    await expectSupportSuppressed(
      page,
      locale.support,
      supportBaseline,
      reopened.panel,
    );
    await page.keyboard.press("Escape");
    expect(await categoryClosingSuppressionSnapshot(page)).toEqual({
      layerRendered: "true",
      widgetDisplay: "none",
      launcherArea: 0,
    });
    await expect(reopened.panel).toBeHidden();
    await expect(reopened.trigger).toBeFocused();
    await expectSupportRestored(page, locale.support, supportBaseline);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
}

test("category layer survives 30 rapid interruption rounds", async ({ page }) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/software");
  const trigger = page.locator(".redesign-software-category-trigger");
  const panel = page.locator(".redesign-software-category-panel");
  const supportBaseline = await captureSupportBaseline(page, "客服");

  for (let run = 0; run < 30; run += 1) {
    await trigger.click();
    await expect(panel).toBeVisible();
    await expectSupportSuppressed(page, "客服", supportBaseline, panel);
    if (run % 3 === 0) {
      await page.keyboard.press("Escape");
    } else if (run % 3 === 1) {
      await page.mouse.click(8, 360);
    } else {
      await page.getByRole("button", { name: "关闭分类" }).click();
    }
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    await expectSupportRestored(page, "客服", supportBaseline);
  }

  await waitForRelevantAnimations(page);
  await expect(
    page.locator(".redesign-software-category-layer"),
  ).toHaveAttribute("data-layer-rendered", "false");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});

test("product stage survives 30 rapid latest-intent rounds", async ({ page }) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");
  const stage = page.locator(".redesign-home-product-stage");
  const next = page.getByRole("button", { name: "下一款产品" });
  const previous = page.getByRole("button", { name: "上一款产品" });
  await stage.scrollIntoViewIfNeeded();

  for (let run = 0; run < 30; run += 1) {
    if (run % 2 === 0) {
      await next.dispatchEvent("click", { detail: 1 });
      await next.dispatchEvent("click", { detail: 1 });
      await previous.dispatchEvent("click", { detail: 1 });
    } else {
      await previous.dispatchEvent("click", { detail: 1 });
      await next.dispatchEvent("click", { detail: 1 });
      await next.dispatchEvent("click", { detail: 1 });
    }
    await expect(currentProduct(page)).toHaveCount(1);
    await expect(currentProduct(page)).toHaveAttribute(
      "data-product-id",
      productIds[(run + 1) % productIds.length],
    );
  }

  await waitForRelevantAnimations(page);
  await expect(page.locator('[data-product-previous="true"]')).toHaveCount(0);
  await expect(currentProduct(page)).toHaveCount(1);
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});

test("mobile navigation survives 30 rapid close and resize rounds", async ({ page }) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/software");
  const trigger = page.getByRole("button", { name: "菜单", exact: true });
  const drawer = page.locator(".redesign-mobile-drawer");

  for (let run = 0; run < 30; run += 1) {
    await trigger.dispatchEvent("click", { detail: 1 });
    await expect(drawer).toBeVisible();
    if (run % 3 === 0) {
      await page.keyboard.press("Escape");
    } else if (run % 3 === 1) {
      await page.locator(".redesign-menu-overlay").dispatchEvent("click", {
        detail: 1,
      });
      await page.locator(".redesign-menu-overlay").dispatchEvent("click", {
        detail: 1,
      });
    } else {
      await page.setViewportSize({ width: 768, height: 900 });
      await expect(drawer).toBeHidden();
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await expect(drawer).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  }

  await waitForRelevantAnimations(page);
  await expect(page.locator(".redesign-menu-overlay")).toHaveCount(0);
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});

test("cross-module flow survives 20 rapid product and drawer rounds", async ({ page }) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");
  const stage = page.locator(".redesign-home-product-stage");
  const next = page.getByRole("button", { name: "下一款产品" });
  const trigger = page.getByRole("button", { name: "菜单", exact: true });
  const drawer = page.locator(".redesign-mobile-drawer");
  await stage.scrollIntoViewIfNeeded();

  for (let run = 0; run < 20; run += 1) {
    await next.dispatchEvent("click", { detail: 1 });
    await trigger.dispatchEvent("click", { detail: 1 });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(currentProduct(page)).toHaveCount(1);
    await expect(currentProduct(page)).toHaveAttribute(
      "data-product-id",
      productIds[(run + 1) % productIds.length],
    );
  }

  await waitForRelevantAnimations(page);
  await expect(page.locator('[data-product-previous="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});
