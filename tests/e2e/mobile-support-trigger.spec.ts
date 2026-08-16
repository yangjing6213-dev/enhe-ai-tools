import { expect, test, type Locator, type Page } from "@playwright/test";

type Rect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

const mobileRoutes = [
  { path: "/software", label: "客服" },
  { path: "/en/software", label: "Chat" },
] as const;

const mobileViewports = [
  { width: 320, height: 844 },
  { width: 360, height: 844 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 483, height: 900 },
] as const;

function intersects(left: Rect, right: Rect) {
  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  );
}

async function rect(locator: Locator): Promise<Rect> {
  return locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      width: bounds.width,
      height: bounds.height,
    };
  });
}

async function openFormalRoute(page: Page, path: string) {
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  await page.goto(path, { waitUntil: "networkidle" });
}

async function scrollIntoView(locator: Locator, block: ScrollLogicalPosition = "center") {
  await locator.evaluate(
    (element, position) =>
      element.scrollIntoView({ block: position, inline: "nearest", behavior: "instant" as ScrollBehavior }),
    block,
  );
}

async function expectNoVisibleIntersections(
  page: Page,
  state: string,
  selector: string,
) {
  const result = await page.evaluate((targetSelector) => {
    const launcher = document.querySelector<HTMLButtonElement>(
      'button[aria-controls="customer-support-panel"]',
    );
    if (!launcher) throw new Error("Missing customer support launcher");

    const launcherRect = launcher.getBoundingClientRect();
    const targets = Array.from(document.querySelectorAll<HTMLElement>(targetSelector))
      .map((element) => ({ element, bounds: element.getBoundingClientRect() }))
      .filter(({ element, bounds }) => {
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.right > 0 &&
          bounds.left < window.innerWidth &&
          bounds.bottom > 0 &&
          bounds.top < window.innerHeight
        );
      });
    const intersections = targets
      .filter(({ bounds }) =>
        launcherRect.left < bounds.right &&
        launcherRect.right > bounds.left &&
        launcherRect.top < bounds.bottom &&
        launcherRect.bottom > bounds.top,
      )
      .map(({ element, bounds }) => ({
        text: element.textContent?.trim().slice(0, 80) ?? "",
        className: element.className,
        bounds: {
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom,
        },
      }));

    return { checked: targets.length, intersections };
  }, selector);

  expect(result.checked, `${state} must resolve at least one visible target`).toBeGreaterThan(0);
  expect(result.intersections, `${state} intersections`).toEqual([]);
  return result.checked;
}

test("uses a 44px icon-only launcher on bilingual mobile software routes", async ({
  page,
}) => {
  for (const viewportSize of mobileViewports) {
    await page.setViewportSize(viewportSize);

    for (const route of mobileRoutes) {
      await openFormalRoute(page, route.path);
      const launcher = page.getByRole("button", { name: route.label, exact: true });
      const bounds = await rect(launcher);

      expect(
        Math.abs(bounds.width - 44),
        `${route.path} ${viewportSize.width}px launcher width`,
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(bounds.height - 44),
        `${route.path} ${viewportSize.width}px launcher height`,
      ).toBeLessThanOrEqual(1);
      await expect(launcher.locator("span", { hasText: route.label })).toBeHidden();
      await expect(launcher.locator("svg")).toBeVisible();
      await expect(launcher).toHaveAttribute("aria-label", route.label);
      await expect(launcher).toHaveAttribute("aria-expanded", "false");
      await expect(launcher).toHaveAttribute("aria-controls", "customer-support-panel");

      const viewport = await launcher.evaluate((button) => {
        const wrapper = button.parentElement;
        if (!wrapper) throw new Error("Missing support launcher wrapper");
        const wrapperRect = wrapper.getBoundingClientRect();
        const wrapperStyle = getComputedStyle(wrapper);
        const outsidePoint = document.elementFromPoint(
          Math.max(0, wrapperRect.left - 8),
          wrapperRect.top + wrapperRect.height / 2,
        );
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          wrapperWidth: wrapperRect.width,
          wrapperHeight: wrapperRect.height,
          rightOffset: window.innerWidth - wrapperRect.right,
          bottomOffset: window.innerHeight - wrapperRect.bottom,
          zIndex: wrapperStyle.zIndex,
          outsideHitsWrapper: Boolean(outsidePoint && wrapper.contains(outsidePoint)),
        };
      });
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
      expect(Math.abs(viewport.wrapperWidth - 44)).toBeLessThanOrEqual(1);
      expect(Math.abs(viewport.wrapperHeight - 44)).toBeLessThanOrEqual(1);
      expect(viewport.rightOffset).toBeGreaterThanOrEqual(16);
      expect(viewport.bottomOffset).toBeGreaterThanOrEqual(16);
      expect(viewport.zIndex).toBe("10");
      expect(viewport.outsideHitsWrapper).toBe(false);
    }
  }
});

test("does not cover the first new-release detail link at the mobile card state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of mobileRoutes) {
    await openFormalRoute(page, route.path);
    const launcher = page.getByRole("button", { name: route.label, exact: true });
    const firstCard = page.locator('[data-section="new-releases"] [data-catalog-card]').first();
    const detailLink = firstCard.locator(".redesign-software-card-link");

    await expect(detailLink).toBeVisible();
    await firstCard.evaluate((element) => element.scrollIntoView({ block: "end" }));
    await expect
      .poll(() =>
        firstCard.evaluate((element) =>
          Math.abs(element.getBoundingClientRect().bottom - window.innerHeight),
        ),
      )
      .toBeLessThanOrEqual(1);

    const launcherRect = await rect(launcher);
    const linkRect = await rect(detailLink);
    expect(
      intersects(launcherRect, linkRect),
      `${route.path} launcher intersects the first new-release detail link: ${JSON.stringify({ launcherRect, linkRect })}`,
    ).toBe(false);
  }
});

test("reserves an 8px fixed safe zone for the 320px featured action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openFormalRoute(page, "/software");

  const launcher = page.getByRole("button", { name: "客服", exact: true });
  const rail = page.locator('[data-section="featured-products"] .redesign-software-rail');
  const card = rail.locator("[data-catalog-card]").first();
  const action = card.locator(".redesign-software-card-link");

  await expect(action).toBeVisible();
  await scrollIntoView(card, "end");
  await expect
    .poll(() =>
      card.evaluate((element) =>
        Math.abs(element.getBoundingClientRect().bottom - window.innerHeight),
      ),
    )
    .toBeLessThanOrEqual(1);

  const [launcherRect, actionRect, cardRect] = await Promise.all([
    rect(launcher),
    rect(action),
    rect(card),
  ]);
  const layout = await rail.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
  }));
  const intersectionWidth = Math.max(
    0,
    Math.min(launcherRect.right, actionRect.right) -
      Math.max(launcherRect.left, actionRect.left),
  );
  const intersectionHeight = Math.max(
    0,
    Math.min(launcherRect.bottom, actionRect.bottom) -
      Math.max(launcherRect.top, actionRect.top),
  );
  const horizontalGap = launcherRect.left - actionRect.right;
  const geometry = {
    launcherRect,
    actionRect,
    cardRect,
    layout,
    intersectionWidth,
    intersectionHeight,
    horizontalGap,
  };

  console.log(`PHASE_2C21R_GEOMETRY ${JSON.stringify(geometry)}`);
  expect(intersectionWidth, JSON.stringify(geometry)).toBe(0);
  expect(horizontalGap, JSON.stringify(geometry)).toBeGreaterThanOrEqual(7);
  expect(Math.abs(launcherRect.left - 260), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
  expect(actionRect.right, JSON.stringify(geometry)).toBeLessThanOrEqual(253);
  expect(actionRect.height, JSON.stringify(geometry)).toBeGreaterThanOrEqual(44);
  expect(layout.rootScrollWidth).toBeLessThanOrEqual(layout.rootClientWidth);
});

test("reserves an 8px fixed safe zone for the 320px all-products action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });

  for (const route of mobileRoutes) {
    await openFormalRoute(page, route.path);
    const launcher = page.getByRole("button", { name: route.label, exact: true });
    const card = page
      .locator('[data-section="all-products"] [data-catalog-card]')
      .first();
    const action = card.locator(".redesign-software-card-link");

    await scrollIntoView(card, "end");
    await expect
      .poll(() =>
        card.evaluate((element) =>
          Math.abs(element.getBoundingClientRect().bottom - window.innerHeight),
        ),
      )
      .toBeLessThanOrEqual(1);

    const [launcherRect, actionRect, cardRect] = await Promise.all([
      rect(launcher),
      rect(action),
      rect(card),
    ]);
    const horizontalIntersection = Math.max(
      0,
      Math.min(launcherRect.right, actionRect.right) -
        Math.max(launcherRect.left, actionRect.left),
    );
    const verticalIntersection = Math.max(
      0,
      Math.min(launcherRect.bottom, actionRect.bottom) -
        Math.max(launcherRect.top, actionRect.top),
    );
    const horizontalGap = launcherRect.left - actionRect.right;
    const geometry = {
      locale: route.path,
      launcherRect,
      actionRect,
      cardRect,
      horizontalGap,
      horizontalIntersection,
      verticalIntersection,
    };

    console.log(`PHASE_2C21R4_ALL_PRODUCTS_GREEN ${JSON.stringify(geometry)}`);
    expect.soft(horizontalIntersection, JSON.stringify(geometry)).toBe(0);
    expect.soft(horizontalGap, JSON.stringify(geometry)).toBeGreaterThanOrEqual(8);
    expect.soft(actionRect.height, JSON.stringify(geometry)).toBeGreaterThanOrEqual(44);
  }
});

test("uses compact exclusion through 483px and expanded exclusion from 484px", async ({
  page,
}) => {
  for (const route of mobileRoutes) {
    for (const contract of [
      { width: 483, reserve: "52px", cardIndex: 0, textVisible: false },
      { width: 484, reserve: "104px", cardIndex: 0, textVisible: true },
      { width: 768, reserve: "104px", cardIndex: 1, textVisible: true },
    ] as const) {
      await page.setViewportSize({ width: contract.width, height: 900 });
      await openFormalRoute(page, route.path);

      const launcher = page.getByRole("button", { name: route.label, exact: true });
      const card = page
        .locator('[data-section="all-products"] [data-catalog-card]')
        .nth(contract.cardIndex);
      const action = card.locator(".redesign-software-card-link");
      await scrollIntoView(card, "end");

      const [launcherRect, actionRect, actionStyle, layout] = await Promise.all([
        rect(launcher),
        rect(action),
        action.evaluate((element) => ({
          marginInlineEnd: getComputedStyle(element).marginInlineEnd,
          dataScope: element.getAttribute("data-support-exclusion"),
        })),
        page.evaluate(() => ({
          rootOverflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
        })),
      ]);
      const geometry = {
        route: route.path,
        ...contract,
        launcherRect,
        actionRect,
        actionStyle,
        gap: launcherRect.left - actionRect.right,
        intersection: Math.max(
          0,
          Math.min(launcherRect.right, actionRect.right) -
            Math.max(launcherRect.left, actionRect.left),
        ),
        layout,
      };

      expect.soft(actionStyle.marginInlineEnd, JSON.stringify(geometry)).toBe(contract.reserve);
      expect.soft(actionStyle.dataScope, JSON.stringify(geometry)).toBe("all-products");
      expect.soft(geometry.intersection, JSON.stringify(geometry)).toBe(0);
      expect.soft(geometry.gap, JSON.stringify(geometry)).toBeGreaterThanOrEqual(8);
      expect.soft(actionRect.height, JSON.stringify(geometry)).toBeGreaterThanOrEqual(44);
      expect.soft(layout.rootOverflow, JSON.stringify(geometry)).toBe(0);
      await expect(launcher.locator("span", { hasText: route.label })).toBeVisible({
        visible: contract.textVisible,
      });

      if (contract.width === 768) {
        const nonRightAction = page
          .locator('[data-section="all-products"] [data-catalog-card]')
          .first()
          .locator(".redesign-software-card-link");
        await expect
          .poll(() => nonRightAction.evaluate((element) => getComputedStyle(element).marginInlineEnd))
          .toBe("0px");
        expect((await rect(nonRightAction)).height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

for (const viewportSize of mobileViewports) {
  test(`keeps critical mobile software and home interactions clear at ${viewportSize.width}px`, async ({
    page,
  }) => {
    let geometryChecks = 0;
    await page.setViewportSize(viewportSize);

    for (const route of mobileRoutes) {
      await openFormalRoute(page, route.path);

      geometryChecks += await expectNoVisibleIntersections(
        page,
        `${route.path} ${viewportSize.width}px top menu trigger`,
        ".redesign-menu-trigger",
      );

      for (const state of [
        {
          name: "new releases",
          anchor: '[data-section="new-releases"] [data-catalog-card]',
          targets: '[data-section="new-releases"] .redesign-software-card-link',
          block: "end" as const,
        },
        {
          name: "featured products",
          anchor: '[data-section="featured-products"] [data-catalog-card]',
          targets: '[data-section="featured-products"] .redesign-software-card-link',
          block: "end" as const,
        },
        {
          name: "all products",
          anchor: '[data-section="all-products"] [data-catalog-card]',
          targets: '[data-section="all-products"] .redesign-software-card-link',
          block: "end" as const,
        },
        {
          name: "pagination",
          anchor: ".redesign-software-load-row",
          targets: ".redesign-software-load-row a",
          block: "center" as const,
        },
        {
          name: "footer",
          anchor: "footer",
          targets: "footer a",
          block: "start" as const,
        },
      ]) {
        const anchor = page.locator(state.anchor).first();
        await expect(anchor, `${route.path} ${state.name} anchor`).toBeVisible();
        await scrollIntoView(anchor, state.block);
        geometryChecks += await expectNoVisibleIntersections(
          page,
          `${route.path} ${viewportSize.width}px ${state.name}`,
          state.targets,
        );
      }

      for (const suffix of ["?page=2", "?category=efficiency"]) {
        await openFormalRoute(page, `${route.path}${suffix}`);
        const pagination = page.locator(".redesign-software-load-row");
        await expect(pagination).toBeVisible();
        await scrollIntoView(pagination);
        geometryChecks += await expectNoVisibleIntersections(
          page,
          `${route.path}${suffix} ${viewportSize.width}px pagination`,
          ".redesign-software-load-row a",
        );
      }
    }

    for (const route of [
      { path: "/", label: "客服" },
      { path: "/en", label: "Chat" },
    ] as const) {
      await openFormalRoute(page, route.path);
      await expect(page.getByRole("button", { name: route.label, exact: true })).toBeVisible();

      for (const state of [
        {
          name: "hero CTA",
          anchor: ".redesign-home-cta",
          targets: ".redesign-home-cta",
          block: "center" as const,
        },
        {
          name: "product controls",
          anchor: ".redesign-home-products",
          targets: ".redesign-home-product-control",
          block: "center" as const,
        },
        {
          name: "brand value CTA",
          anchor: ".redesign-home-brand-value-cta",
          targets: ".redesign-home-brand-value-cta",
          block: "end" as const,
        },
        {
          name: "review controls",
          anchor: ".redesign-home-reviews",
          targets: ".redesign-home-reviews-control",
          block: "center" as const,
        },
        {
          name: "footer",
          anchor: "footer",
          targets: "footer a",
          block: "start" as const,
        },
      ]) {
        const anchor = page.locator(state.anchor).first();
        await expect(anchor, `${route.path} ${state.name} anchor`).toBeVisible();
        await scrollIntoView(anchor, state.block);
        geometryChecks += await expectNoVisibleIntersections(
          page,
          `${route.path} ${viewportSize.width}px ${state.name}`,
          state.targets,
        );
      }
    }

    expect(geometryChecks).toBeGreaterThan(0);
  });
}

test("keeps keyboard activation, Escape close, state sync, and focus return", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/software");

  const launcher = page.getByRole("button", { name: "客服", exact: true });
  await launcher.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(launcher).toHaveAttribute("aria-expanded", "true");
  await expect(launcher).toHaveAttribute("tabindex", "-1");
  await expect(dialog.locator("button").first()).toBeFocused();

  const panelFocusables = dialog.locator(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  const panelFocusableCount = await panelFocusables.count();
  expect(panelFocusableCount).toBeGreaterThan(1);
  for (let index = 0; index < panelFocusableCount; index += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(panelFocusables.first()).toBeFocused();

  await dialog.locator("button").nth(1).click();
  await expect(dialog.locator("button").first()).toBeFocused();
  await dialog.locator("button").last().click();
  await expect(dialog.locator("button").first()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();

  await page.keyboard.press("Space");
  const reopenedDialog = page.getByRole("dialog");
  await expect(reopenedDialog).toBeVisible();
  const reopenedFocusables = reopenedDialog.locator(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  await expect(reopenedFocusables.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(reopenedFocusables.last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(reopenedDialog).toBeHidden();
  await expect(launcher).toBeFocused();
});

test("keeps the mobile launcher below the open navigation drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/software");

  const launcher = page.getByRole("button", { name: "客服", exact: true });
  const launcherRect = await rect(launcher);
  await launcher.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const dialogRect = await rect(dialog);
  await page.locator(".redesign-menu-trigger").click();
  await expect(page.locator(".redesign-mobile-drawer")).toBeVisible();

  const hit = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    return {
      isSupport: Boolean(target?.closest(".customer-support-widget")),
      isMenu: Boolean(target?.closest(".redesign-mobile-drawer, .redesign-menu-overlay")),
    };
  }, {
    x: launcherRect.left + launcherRect.width / 2,
    y: launcherRect.top + launcherRect.height / 2,
  });

  expect(hit.isSupport).toBe(false);
  expect(hit.isMenu).toBe(true);

  const openPanelHit = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    return {
      isSupport: Boolean(target?.closest("#customer-support-panel")),
      isMenu: Boolean(target?.closest(".redesign-mobile-drawer, .redesign-menu-overlay")),
    };
  }, {
    x: dialogRect.left + dialogRect.width / 2,
    y: dialogRect.top + dialogRect.height / 2,
  });

  expect(openPanelHit.isSupport).toBe(false);
  expect(openPanelHit.isMenu).toBe(true);

  await page.locator(".redesign-drawer-close").click();
  await expect(page.locator(".redesign-mobile-drawer")).toBeHidden();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(dialog.locator("button").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
});

test("keeps the mobile launcher below the open category sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/software");

  const launcher = page.locator('button[aria-controls="customer-support-panel"]');
  const launcherRect = await rect(launcher);
  await page.locator(".redesign-software-category-trigger").click();
  const overlay = page.locator(".redesign-software-category-overlay");
  const panel = page.locator(".redesign-software-category-panel");
  await expect(overlay).toBeVisible();
  await expect(panel).toBeVisible();

  const hit = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    return {
      isSupport: Boolean(target?.closest(".customer-support-widget")),
      isCategory: Boolean(
        target?.closest(
          ".redesign-software-category-overlay, .redesign-software-category-panel",
        ),
      ),
    };
  }, {
    x: launcherRect.left + launcherRect.width / 2,
    y: launcherRect.top + launcherRect.height / 2,
  });

  expect(hit.isSupport).toBe(false);
  expect(hit.isCategory).toBe(true);

  await overlay.click({ position: { x: 8, y: 8 } });
  await expect(panel).toBeHidden();
  await launcher.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("keeps component exclusions aligned with a non-zero right safe area", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let geometryChecks = 0;

  for (const route of mobileRoutes) {
    await openFormalRoute(page, route.path);
    await page.locator(".enhe-redesign-production").evaluate((root) => {
      (root as HTMLElement).style.setProperty(
        "--support-safe-area-inline-end",
        "24px",
      );
    });
    const launcher = page.locator('button[aria-controls="customer-support-panel"]');
    const launcherBounds = await rect(launcher);
    expect(Math.abs(390 - launcherBounds.right - 40)).toBeLessThanOrEqual(0.1);

    for (const state of [
      {
        name: "new releases",
        anchor: '[data-section="new-releases"] [data-catalog-card]',
        targets: '[data-section="new-releases"] .redesign-software-card-link',
      },
      {
        name: "featured products",
        anchor: '[data-section="featured-products"] [data-catalog-card]',
        targets: '[data-section="featured-products"] .redesign-software-card-link',
      },
      {
        name: "all products",
        anchor: '[data-section="all-products"] [data-catalog-card]',
        targets: '[data-section="all-products"] .redesign-software-card-link',
      },
      {
        name: "pagination",
        anchor: ".redesign-software-load-row",
        targets: ".redesign-software-load-row a",
      },
      { name: "footer", anchor: "footer", targets: "footer a" },
    ]) {
      const anchor = page.locator(state.anchor).first();
      await expect(anchor, `${route.path} safe-area ${state.name} anchor`).toBeVisible();
      await scrollIntoView(anchor, state.name === "footer" ? "start" : "end");
      geometryChecks += await expectNoVisibleIntersections(
        page,
        `${route.path} safe-area ${state.name}`,
        state.targets,
      );
    }
  }

  for (const route of ["/", "/en"] as const) {
    await openFormalRoute(page, route);
    await page.locator(".enhe-redesign-production").evaluate((root) => {
      (root as HTMLElement).style.setProperty(
        "--support-safe-area-inline-end",
        "24px",
      );
    });
    const launcher = page.locator('button[aria-controls="customer-support-panel"]');
    const launcherBounds = await rect(launcher);
    expect(Math.abs(390 - launcherBounds.right - 40)).toBeLessThanOrEqual(0.1);

    for (const state of [
      {
        name: "product controls",
        anchor: ".redesign-home-products",
        targets: ".redesign-home-product-control",
        block: "center" as const,
      },
      {
        name: "brand value CTA",
        anchor: ".redesign-home-brand-value-cta",
        targets: ".redesign-home-brand-value-cta",
        block: "end" as const,
      },
      {
        name: "footer",
        anchor: "footer",
        targets: "footer a",
        block: "start" as const,
      },
    ]) {
      const anchor = page.locator(state.anchor).first();
      await expect(anchor, `${route} safe-area ${state.name} anchor`).toBeVisible();
      await scrollIntoView(anchor, state.block);
      geometryChecks += await expectNoVisibleIntersections(
        page,
        `${route} safe-area ${state.name}`,
        state.targets,
      );
    }
  }

  expect(geometryChecks).toBeGreaterThan(0);
});

test("retains the exact desktop launcher baseline from 768px upward", async ({ page }) => {
  for (const viewportSize of [
    { width: 768, height: 900, offset: 24 },
    { width: 1024, height: 900, offset: 24 },
    { width: 1440, height: 900, offset: 24 },
  ]) {
    await page.setViewportSize(viewportSize);

    for (const route of [
      { path: "/software", label: "客服", width: 88 },
      { path: "/en/software", label: "Chat", width: 95.546875 },
    ] as const) {
      await openFormalRoute(page, route.path);
      const launcher = page.getByRole("button", { name: route.label, exact: true });
      const metrics = await launcher.evaluate((button) => {
        const bounds = button.getBoundingClientRect();
        const wrapper = button.parentElement;
        if (!wrapper) throw new Error("Missing support launcher wrapper");
        const wrapperBounds = wrapper.getBoundingClientRect();
        const buttonStyle = getComputedStyle(button);
        const wrapperStyle = getComputedStyle(wrapper);
        return {
          width: bounds.width,
          height: bounds.height,
          right: window.innerWidth - bounds.right,
          bottom: window.innerHeight - bounds.bottom,
          wrapperWidth: wrapperBounds.width,
          padding: buttonStyle.padding,
          backgroundColor: buttonStyle.backgroundColor,
          color: buttonStyle.color,
          zIndex: wrapperStyle.zIndex,
        };
      });

      await expect(launcher.locator("span", { hasText: route.label })).toBeVisible();
      await expect(launcher.locator("svg")).toBeVisible();
      expect(Math.abs(metrics.width - route.width)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(metrics.height - 46)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(metrics.right - viewportSize.offset)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(metrics.bottom - viewportSize.offset)).toBeLessThanOrEqual(0.1);
      expect(metrics.wrapperWidth).toBe(360);
      expect(metrics.padding).toBe("12px 16px");
      expect(metrics.backgroundColor).toBe("lab(7.78901 -1.45968 -7.55699 / 0.95)");
      expect(metrics.color).toBe("rgb(255, 255, 255)");
      expect(metrics.zIndex).toBe("70");
    }
  }
});
