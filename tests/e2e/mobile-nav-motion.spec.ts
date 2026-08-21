import { expect, test, type Page } from "@playwright/test";

const mobileWidths = [320, 390, 480, 483, 484, 767] as const;
const desktopWidths = [768, 769, 1024, 1440] as const;
const routes = [
  {
    path: "/",
    menuLabel: "菜单",
    closeLabel: "收起菜单",
    supportLabel: "客服",
  },
  {
    path: "/software",
    menuLabel: "菜单",
    closeLabel: "收起菜单",
    supportLabel: "客服",
  },
  {
    path: "/en",
    menuLabel: "Menu",
    closeLabel: "Close menu",
    supportLabel: "Chat",
  },
  {
    path: "/en/software",
    menuLabel: "Menu",
    closeLabel: "Close menu",
    supportLabel: "Chat",
  },
] as const;

async function openFormalRoute(page: Page, route: string) {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
  const response = await page.goto(route, { waitUntil: "load" });
  expect(response?.status(), `${route} response status`).toBe(200);
}

async function rootOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function drawerTranslateX(page: Page) {
  return page.locator(".redesign-mobile-drawer").evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
  });
}

type CapturedMotion = {
  duration: number;
  easing: string;
  opacityFrom: number | null;
  opacityTo: number | null;
  hasOpacity: boolean;
  hasTransform: boolean;
  target: "drawer" | "overlay";
  targetWidth: number;
  transformFromPx: number | null;
  transformToPx: number | null;
};

async function resetMotionCapture(page: Page) {
  await page.evaluate(() => {
    type CaptureWindow = Window & {
      __enheMotionCalls?: CapturedMotion[];
      __enheMotionCaptureInstalled?: boolean;
    };
    const captureWindow = window as CaptureWindow;

    if (!captureWindow.__enheMotionCaptureInstalled) {
      const originalAnimate = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        const target = this.classList.contains("redesign-mobile-drawer")
          ? "drawer"
          : this.classList.contains("redesign-menu-overlay")
            ? "overlay"
            : null;
        const targetWidth = target ? this.getBoundingClientRect().width : 0;
        const initialStyle = target ? getComputedStyle(this) : null;
        const animation = originalAnimate.call(this, keyframes, options);
        if (target) {
          const frames =
            animation.effect instanceof KeyframeEffect
              ? animation.effect.getKeyframes()
              : Array.isArray(keyframes)
                ? keyframes
                : [keyframes];
          const properties = new Set(
            frames.flatMap((frame) => (frame ? Object.keys(frame) : [])),
          );
          const firstFrame = frames[0] as Record<string, unknown> | undefined;
          const lastFrame = frames.at(-1) as Record<string, unknown> | undefined;
          const rawEndpoint = (
            property: "opacity" | "transform",
            position: "first" | "last",
          ) => {
            if (Array.isArray(keyframes)) {
              const frame =
                position === "first" ? keyframes[0] : keyframes.at(-1);
              return (frame as Record<string, unknown> | undefined)?.[property];
            }
            const value = (keyframes as Record<string, unknown>)[property];
            if (Array.isArray(value)) {
              return position === "first" ? value[0] : value.at(-1);
            }
            return position === "last" ? value : undefined;
          };
          const transformToPixels = (value: unknown) => {
            if (value === undefined || value === null) return null;
            const text = String(value).replace(/\s/g, "");
            if (text === "none") return 0;
            const translate =
              text.match(/translateX\((-?[\d.]+)(px|%)\)/) ??
              text.match(/translate3d\((-?[\d.]+)(px|%),/);
            if (translate) {
              const amount = Number(translate[1]);
              return translate[2] === "%" ? (amount / 100) * targetWidth : amount;
            }
            try {
              return new DOMMatrixReadOnly(text).m41;
            } catch {
              return null;
            }
          };
          const opacityToNumber = (value: unknown) => {
            if (value === undefined || value === null) return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          };
          captureWindow.__enheMotionCalls?.push({
            target,
            duration:
              typeof options === "number"
                ? options
                : Number(options?.duration ?? 0),
            easing:
              typeof options === "object" && options?.easing
                ? String(options.easing)
                : "linear",
            hasOpacity: properties.has("opacity"),
            hasTransform: properties.has("transform"),
            opacityFrom:
              opacityToNumber(firstFrame?.opacity) ??
              opacityToNumber(rawEndpoint("opacity", "first")) ??
              opacityToNumber(initialStyle?.opacity),
            opacityTo:
              opacityToNumber(lastFrame?.opacity) ??
              opacityToNumber(rawEndpoint("opacity", "last")),
            targetWidth,
            transformFromPx:
              transformToPixels(firstFrame?.transform) ??
              transformToPixels(rawEndpoint("transform", "first")) ??
              transformToPixels(initialStyle?.transform),
            transformToPx:
              transformToPixels(lastFrame?.transform) ??
              transformToPixels(rawEndpoint("transform", "last")),
          });
        }
        return animation;
      };
      captureWindow.__enheMotionCaptureInstalled = true;
    }

    captureWindow.__enheMotionCalls = [];
  });
}

async function expectCapturedMotion(
  page: Page,
  target: CapturedMotion["target"],
  expected: {
    duration: number;
    easing: "linear" | "directional";
    from?: number | "width";
    property: "opacity" | "transform";
    to?: number | "width";
  },
) {
  const readAnimations = () =>
    page.evaluate(
      ({ requestedTarget }) => {
        const captureWindow = window as Window & {
          __enheMotionCalls?: CapturedMotion[];
        };
        return (captureWindow.__enheMotionCalls ?? []).filter(
          (call) => call.target === requestedTarget,
        );
      },
      { requestedTarget: target },
    );
  await expect.poll(async () => (await readAnimations()).length).toBe(1);
  const animations = await readAnimations();
  expect(animations).toHaveLength(1);
  expect(animations[0]?.duration).toBe(expected.duration);
  if (expected.easing === "linear") {
    expect(animations[0]?.easing).toBe("linear");
  } else {
    expect(animations[0]?.easing).toMatch(
      /^cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)$/,
    );
  }
  expect(animations[0]?.hasOpacity).toBe(expected.property === "opacity");
  expect(animations[0]?.hasTransform).toBe(expected.property === "transform");
  if (expected.from !== undefined) {
    const from =
      expected.property === "opacity"
        ? animations[0]?.opacityFrom
        : animations[0]?.transformFromPx;
    const expectedFrom =
      expected.from === "width" ? animations[0]?.targetWidth : expected.from;
    expect(from).not.toBeNull();
    expect(from).toBeCloseTo(expectedFrom ?? Number.NaN, 0);
  }
  if (expected.to !== undefined) {
    const to =
      expected.property === "opacity"
        ? animations[0]?.opacityTo
        : animations[0]?.transformToPx;
    const expectedTo =
      expected.to === "width" ? animations[0]?.targetWidth : expected.to;
    expect(to).not.toBeNull();
    expect(to).toBeCloseTo(expectedTo ?? Number.NaN, 0);
  }
}

function monitorErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

type ExpectedDrawerMotion = {
  durationMs: string;
  overlayDurationMs: string;
  modality: "pointer" | "reduced";
  properties: "transform" | "opacity";
};

const POINTER_OPEN_MOTION: ExpectedDrawerMotion = {
  durationMs: "230",
  overlayDurationMs: "180",
  modality: "pointer",
  properties: "transform",
};

async function openPointerDrawer(
  page: Page,
  menuLabel: string,
  expectedMotion: ExpectedDrawerMotion = POINTER_OPEN_MOTION,
) {
  const trigger = page.getByRole("button", { name: menuLabel, exact: true });
  await resetMotionCapture(page);
  await trigger.click();
  const drawer = page.locator(".redesign-mobile-drawer");
  const overlay = page.locator(".redesign-menu-overlay");
  await expectCapturedMotion(page, "drawer", {
    duration: Number(expectedMotion.durationMs),
    easing: expectedMotion.modality === "pointer" ? "directional" : "linear",
    property: expectedMotion.properties,
    from: expectedMotion.properties === "transform" ? "width" : 0,
    to: expectedMotion.properties === "transform" ? 0 : 1,
  });
  await expectCapturedMotion(page, "overlay", {
    duration: Number(expectedMotion.overlayDurationMs),
    easing: expectedMotion.modality === "pointer" ? "directional" : "linear",
    property: "opacity",
    from: 0,
    to: 1,
  });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute("role", "dialog");
  await expect(drawer).toHaveAttribute("aria-modal", "true");
  await expect(drawer).toHaveAttribute("data-motion-variant", "directional-drawer");
  await expect(drawer).toHaveAttribute(
    "data-motion-duration-ms",
    expectedMotion.durationMs,
  );
  await expect(drawer).toHaveAttribute(
    "data-motion-modality",
    expectedMotion.modality,
  );
  await expect(drawer).toHaveAttribute(
    "data-motion-properties",
    expectedMotion.properties,
  );
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  return { drawer, trigger };
}

for (const route of routes) {
  for (const width of mobileWidths) {
    test(`directional drawer passes on ${route.path} at ${width}px`, async ({
      page,
    }) => {
      const errors = monitorErrors(page);
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await openFormalRoute(page, route.path);
      const { drawer, trigger } = await openPointerDrawer(page, route.menuLabel);
      const overlay = page.locator(".redesign-menu-overlay");
      await expect(overlay).toBeVisible();
      await expect(overlay).toHaveAttribute("data-motion-duration-ms", "180");
      expect(await rootOverflow(page), `${route.path} ${width}px root overflow`).toBe(0);
      await expect(drawer.locator("[aria-selected]"), "ordinary nav aria-selected").toHaveCount(0);

      const drawerBounds = await drawer.boundingBox();
      expect(drawerBounds, `${route.path} ${width}px drawer bounds`).not.toBeNull();
      expect((drawerBounds?.x ?? -1) >= 0).toBe(true);
      await expect
        .poll(async () => {
          const settledBounds = await drawer.boundingBox();
          return Math.abs(
            (settledBounds?.x ?? 0) + (settledBounds?.width ?? 0) - width,
          );
        })
        .toBeLessThanOrEqual(1);

      if (width === 483 || width === 484) {
        const support = page.getByRole("button", {
          name: route.supportLabel,
          exact: true,
        });
        const supportBounds = await support.boundingBox();
        expect(supportBounds).not.toBeNull();
        const menuOwnsHit = await page.evaluate(({ x, y }) => {
          const hit = document.elementFromPoint(x, y);
          return Boolean(
            hit?.closest(".redesign-mobile-drawer, .redesign-menu-overlay"),
          );
        }, {
          x: (supportBounds?.x ?? 0) + (supportBounds?.width ?? 0) / 2,
          y: (supportBounds?.y ?? 0) + (supportBounds?.height ?? 0) / 2,
        });
        expect(menuOwnsHit, `${route.path} ${width}px support interception`).toBe(true);
      }

      if (width > 360) {
        await resetMotionCapture(page);
        await overlay.click({ position: { x: 8, y: 120 } });
      } else {
        await resetMotionCapture(page);
        await page
          .getByRole("button", { name: route.closeLabel, exact: true })
          .click();
      }
      await expect(drawer).toHaveAttribute("data-motion-duration-ms", "190");
      await expectCapturedMotion(page, "drawer", {
        duration: 190,
        easing: "directional",
        property: "transform",
        from: 0,
        to: "width",
      });
      await expectCapturedMotion(page, "overlay", {
        duration: 160,
        easing: "directional",
        property: "opacity",
        from: 1,
        to: 0,
      });
      await expect(drawer).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");

      expect(errors.consoleErrors).toEqual([]);
      expect(errors.pageErrors).toEqual([]);
    });
  }

  for (const width of desktopWidths) {
    test(`desktop navigation remains stable on ${route.path} at ${width}px`, async ({
      page,
    }) => {
      const errors = monitorErrors(page);
      await page.setViewportSize({ width, height: 900 });
      await openFormalRoute(page, route.path);
      await expect(page.locator(".redesign-menu-trigger")).toBeHidden();
      await expect(page.locator(".redesign-desktop-nav")).toBeVisible();
      await expect(page.locator(".redesign-mobile-drawer")).toHaveCount(0);
      expect(await rootOverflow(page), `${route.path} ${width}px root overflow`).toBe(0);

      expect(errors.consoleErrors).toEqual([]);
      expect(errors.pageErrors).toEqual([]);
    });
  }
}

for (const locale of [
  { path: "/", menuLabel: "菜单", closeLabel: "收起菜单" },
  { path: "/en", menuLabel: "Menu", closeLabel: "Close menu" },
] as const) {
  test(`keyboard drawer lifecycle passes on ${locale.path}`, async ({ page }) => {
    const errors = monitorErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openFormalRoute(page, locale.path);

    const trigger = page.getByRole("button", {
      name: locale.menuLabel,
      exact: true,
    });
    await trigger.focus();
    await resetMotionCapture(page);
    await page.keyboard.press("Enter");

    let drawer = page.locator(".redesign-mobile-drawer");
    await expectCapturedMotion(page, "drawer", {
      duration: 100,
      easing: "linear",
      property: "opacity",
      from: 0,
      to: 1,
    });
    await expectCapturedMotion(page, "overlay", {
      duration: 100,
      easing: "linear",
      property: "opacity",
      from: 0,
      to: 1,
    });
    const closeButton = page.getByRole("button", {
      name: locale.closeLabel,
      exact: true,
    });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("data-motion-duration-ms", "100");
    await expect(drawer).toHaveAttribute("data-motion-modality", "keyboard");
    await expect(drawer).toHaveAttribute("data-motion-properties", "opacity");
    await expect(closeButton).toBeFocused();

    const lastFocusable = drawer.locator(".redesign-mobile-account a").last();
    await page.keyboard.press("Shift+Tab");
    await expect(lastFocusable).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();

    await resetMotionCapture(page);
    await page.keyboard.press("Escape");
    await expectCapturedMotion(page, "drawer", {
      duration: 100,
      easing: "linear",
      property: "opacity",
      from: 1,
      to: 0,
    });
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

    await page.keyboard.press("Space");
    drawer = page.locator(".redesign-mobile-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("data-motion-modality", "keyboard");
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
}

for (const locale of [
  { path: "/software", menuLabel: "菜单" },
  { path: "/en/software", menuLabel: "Menu" },
] as const) {
  test(`reduced-motion drawer stays opacity-only on ${locale.path}`, async ({ page }) => {
    const errors = monitorErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await openFormalRoute(page, locale.path);

    const { drawer } = await openPointerDrawer(page, locale.menuLabel, {
      durationMs: "80",
      overlayDurationMs: "80",
      modality: "reduced",
      properties: "opacity",
    });
    await expect(drawer).toHaveAttribute("data-motion-duration-ms", "80");
    await expect(drawer).toHaveAttribute("data-motion-modality", "reduced");
    await expect(drawer).toHaveAttribute("data-motion-properties", "opacity");
    const movingTransforms = await drawer.evaluate((element) =>
      element
        .getAnimations()
        .filter((animation) => Number(animation.effect?.getTiming().duration ?? 0) > 0)
        .flatMap((animation) =>
          animation.effect instanceof KeyframeEffect
            ? animation.effect.getKeyframes().map((frame) => frame.transform)
            : [],
        )
        .filter(Boolean),
    );
    expect(movingTransforms).toEqual([]);

    await resetMotionCapture(page);
    await page.keyboard.press("Escape");
    await expectCapturedMotion(page, "drawer", {
      duration: 80,
      easing: "linear",
      property: "opacity",
      from: 1,
      to: 0,
    });
    await expect(drawer).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
}

test("rapid open-close-open keeps only the latest drawer intent", async ({ page }) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/software");
  const trigger = page.getByRole("button", { name: "菜单", exact: true });
  const drawer = page.locator(".redesign-mobile-drawer");

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await trigger.dispatchEvent("click", { detail: 1 });
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toHaveAttribute("data-motion-phase", "open");
  await expect(drawer).toHaveAttribute("data-motion-modality", "pointer");
  await expect(drawer).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  await page.locator(".redesign-menu-overlay").click({ position: { x: 8, y: 100 } });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await trigger.dispatchEvent("click", { detail: 1 });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute("data-motion-phase", "open");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await trigger.dispatchEvent("click", { detail: 1 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await trigger.dispatchEvent("click", { detail: 1 });
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});

test("repeated close intents let the active exit finish", async ({ page }) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/software");
  const trigger = page.getByRole("button", { name: "菜单", exact: true });
  const drawer = page.locator(".redesign-mobile-drawer");
  const overlay = page.locator(".redesign-menu-overlay");

  await trigger.click();
  await expect(drawer).toBeVisible();
  await overlay.click({ position: { x: 8, y: 100 } });
  await expect(drawer).toHaveAttribute("data-motion-phase", "close");
  await page.waitForTimeout(25);
  await overlay.dispatchEvent("click", { detail: 1 });

  await expect(drawer).toBeHidden();
  await expect(drawer).toHaveCount(0);
  await expect(overlay).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});

test("mixed keyboard and pointer interruptions preserve the rendered drawer position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");
  await resetMotionCapture(page);
  const trigger = page.getByRole("button", { name: "菜单", exact: true });
  const drawer = page.locator(".redesign-mobile-drawer");

  await trigger.click();
  await expect(drawer).toBeVisible();
  const beforeEscape = await drawerTranslateX(page);
  expect(beforeEscape).toBeGreaterThan(0.5);

  await page.evaluate(() => {
    const captureWindow = window as Window & {
      __enheEscapeTranslateX?: number;
    };
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") return;
        const drawer = document.querySelector<HTMLElement>(
          ".redesign-mobile-drawer",
        );
        if (!drawer) return;
        captureWindow.__enheEscapeTranslateX = new DOMMatrixReadOnly(
          getComputedStyle(drawer).transform,
        ).m41;
      },
      { capture: true, once: true },
    );
  });
  await page.keyboard.press("Escape");
  const escapeHandoff = await drawer.evaluate((element) => {
    const captureWindow = window as Window & {
      __enheEscapeTranslateX?: number;
    };
    return {
      after: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      atEvent: captureWindow.__enheEscapeTranslateX,
    };
  });
  expect(escapeHandoff.atEvent).toBeDefined();
  expect(
    Math.abs(escapeHandoff.after - (escapeHandoff.atEvent ?? Number.NaN)),
  ).toBeLessThanOrEqual(1);
  const keyboardCloseAnimations = await drawer.evaluate((element) =>
    element
      .getAnimations()
      .filter((animation) => animation.playState === "running")
      .map((animation) => ({
        duration: Number(animation.effect?.getTiming().duration ?? 0),
        keyframes:
          animation.effect instanceof KeyframeEffect
            ? animation.effect.getKeyframes()
            : [],
      })),
  );
  expect(keyboardCloseAnimations).toHaveLength(1);
  expect(keyboardCloseAnimations[0]?.duration).toBe(100);
  expect(keyboardCloseAnimations[0]?.keyframes.some((frame) => frame.transform)).toBe(false);

  await trigger.focus();
  await trigger.dispatchEvent("click", { detail: 1 });
  await expect(drawer).toHaveAttribute("data-motion-phase", "open");
  await expect(drawer).toHaveCSS("opacity", "1");
  await expect.poll(() => drawerTranslateX(page)).toBeLessThanOrEqual(1);

  await page
    .locator(".redesign-menu-overlay")
    .click({ position: { x: 8, y: 100 } });
  await page.waitForTimeout(40);
  const beforeKeyboardOpen = await drawer.evaluate((element) => ({
    opacity: Number(getComputedStyle(element).opacity),
    translateX: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
  }));
  expect(beforeKeyboardOpen.opacity).toBeGreaterThan(0.9);
  expect(beforeKeyboardOpen.translateX).toBeGreaterThan(4);

  await resetMotionCapture(page);
  const handoffSamples = await page.evaluate(async () => {
    const trigger = document.querySelector<HTMLButtonElement>(
      ".redesign-menu-trigger",
    );
    const drawer = document.querySelector<HTMLElement>(
      ".redesign-mobile-drawer",
    );
    if (!trigger || !drawer) throw new Error("mobile drawer controls missing");

    trigger.focus();
    trigger.click();
    const startedAt = performance.now();
    const samples: Array<{
      elapsed: number;
      opacity: number;
      translateX: number;
    }> = [];
    await new Promise<void>((resolve) => {
      const sample = () => {
        const style = getComputedStyle(drawer);
        samples.push({
          elapsed: performance.now() - startedAt,
          opacity: Number(style.opacity),
          translateX: new DOMMatrixReadOnly(style.transform).m41,
        });
        if (performance.now() - startedAt < 120) {
          requestAnimationFrame(sample);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(sample);
    });
    return samples;
  });
  const readHandoffAnimations = () =>
    page.evaluate(() => {
      const captureWindow = window as Window & {
        __enheMotionCalls?: CapturedMotion[];
      };
      return (captureWindow.__enheMotionCalls ?? []).filter(
        (call) => call.target === "drawer",
      );
    });
  await expect.poll(async () => (await readHandoffAnimations()).length).toBe(2);
  const [fadeOut, fadeIn] = await readHandoffAnimations();
  expect(fadeOut).toMatchObject({
    duration: 50,
    easing: "linear",
    hasOpacity: true,
    hasTransform: false,
  });
  expect(fadeOut?.opacityFrom).toBeCloseTo(1, 0);
  expect(fadeOut?.opacityTo).toBeCloseTo(0, 0);
  expect(fadeOut?.transformFromPx).toBeGreaterThan(
    beforeKeyboardOpen.translateX * 0.6,
  );
  expect(fadeIn).toMatchObject({
    duration: 50,
    easing: "linear",
    hasOpacity: true,
    hasTransform: false,
  });
  expect(fadeIn?.opacityFrom).toBeCloseTo(0, 0);
  expect(fadeIn?.opacityTo).toBeCloseTo(1, 0);
  expect(fadeIn?.transformFromPx).toBeCloseTo(0, 0);
  const firstNormalizedSample = handoffSamples.find(
    (sample) => Math.abs(sample.translateX) <= 1,
  );
  expect(firstNormalizedSample).toBeDefined();
  const visibleBeforeNormalization = handoffSamples.filter(
    (sample) =>
      sample.elapsed < (firstNormalizedSample?.elapsed ?? Number.POSITIVE_INFINITY) &&
      sample.opacity >= 0.2,
  );
  expect(visibleBeforeNormalization.length).toBeGreaterThan(0);
  expect(
    Math.min(...visibleBeforeNormalization.map((sample) => sample.translateX)),
  ).toBeGreaterThan(beforeKeyboardOpen.translateX * 0.6);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toHaveAttribute("data-motion-modality", "keyboard");
  await expect(drawer).toHaveCSS("opacity", "1");
  await expect.poll(() => drawerTranslateX(page)).toBeLessThanOrEqual(1);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("desktop resize closes the mobile drawer and releases modal state", async ({ page }) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 767, height: 900 });
  await openFormalRoute(page, "/software");
  const { drawer } = await openPointerDrawer(page, "菜单");
  const hiddenTrigger = page.locator(".redesign-menu-trigger");

  await page.setViewportSize({ width: 768, height: 900 });
  await expect(hiddenTrigger).toBeHidden();
  await expect(hiddenTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(drawer).toBeHidden();
  await expect(page.locator(".redesign-desktop-nav")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await expect(page.locator(".redesign-desktop-nav a[href]").first()).toBeFocused();
  await expect(page.locator(".redesign-mobile-drawer")).toHaveCount(0);

  await page.setViewportSize({ width: 769, height: 900 });
  await expect(page.locator(".redesign-desktop-nav")).toBeVisible();
  await expect(page.getByRole("button", { name: "客服", exact: true })).toBeVisible();
  expect(await rootOverflow(page)).toBe(0);
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});

test("navigation and language links remain immediate and unchanged", async ({ page }) => {
  const errors = monitorErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");
  const { drawer } = await openPointerDrawer(page, "菜单");

  const items = drawer.locator(
    ".redesign-mobile-nav > a, .redesign-mobile-nav > details",
  );
  await expect(items).toHaveCount(6);
  await expect(items).toHaveText([
    "AI工具",
    "AI SkillAI 提示词AI Skill",
    "AI资讯",
    "AI趋势",
    "关于我们",
    "搜索",
  ]);
  await expect(drawer.locator("[aria-selected]")).toHaveCount(0);

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/software"),
    drawer.locator('a[href="/software"]').click(),
  ]);
  await expect(page.locator(".redesign-mobile-drawer")).toHaveCount(0);

  const mobileActions = page.locator(".redesign-mobile-actions");
  const order = await mobileActions.evaluate((element) =>
    Array.from(element.children).map((child) => child.className),
  );
  expect(order[0]).toContain("redesign-language-switch");
  expect(order[1]).toContain("redesign-mobile-menu-root");

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/en/software"),
    mobileActions.locator('a[lang="en"]').click(),
  ]);
  await expect(page.locator(".redesign-mobile-drawer")).toHaveCount(0);
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});
