import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [1440, 1024, 768, 480, 390, 320] as const;
const locales = [
  {
    route: "/",
    previous: "上一款产品",
    next: "下一款产品",
    firstName: "无所不能版｜AI生成视频应用",
    secondName: "InfiniteTalk",
  },
  {
    route: "/en",
    previous: "Previous product",
    next: "Next product",
    firstName: "Ultimate Edition | AI Video Generation Suite",
    secondName: "InfiniteTalk",
  },
] as const;

function boxesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

async function openFormalRoute(page: Page, route: string) {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${route} response status`).toBe(200);
}

function currentProduct(stage: Locator) {
  return stage.locator('[data-product-current="true"]');
}

for (const width of viewports) {
  for (const locale of locales) {
    test(`directional product stage passes ${locale.route} at ${width}px`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await openFormalRoute(page, locale.route);

      const stage = page.locator(".redesign-home-product-stage");
      const previous = page.getByRole("button", { name: locale.previous });
      const next = page.getByRole("button", { name: locale.next });
      await stage.scrollIntoViewIfNeeded();

      await expect(currentProduct(stage)).toHaveAttribute(
        "data-product-id",
        "ultimate-edition",
      );
      await expect(currentProduct(stage)).toContainText(locale.firstName);

      await next.click();
      await expect(stage).toHaveAttribute(
        "data-motion-variant",
        "directional-slide",
      );
      await expect(stage).toHaveAttribute("data-motion-duration-ms", "240");
      await expect(stage).toHaveAttribute("data-motion-modality", "pointer");
      await expect(stage).toHaveAttribute("data-motion-direction", "forward");
      await expect(stage).toHaveAttribute(
        "data-motion-enter-transform",
        "translateX(12px)",
      );
      await expect(stage).toHaveAttribute(
        "data-motion-exit-transform",
        "translateX(-12px)",
      );
      await expect(currentProduct(stage)).toHaveAttribute(
        "data-product-id",
        "infinitetalk",
      );
      await expect(currentProduct(stage)).toContainText(locale.secondName);

      await previous.click();
      await expect(stage).toHaveAttribute("data-motion-direction", "backward");
      await expect(stage).toHaveAttribute(
        "data-motion-enter-transform",
        "translateX(-12px)",
      );
      await expect(stage).toHaveAttribute(
        "data-motion-exit-transform",
        "translateX(12px)",
      );
      await expect(currentProduct(stage)).toHaveAttribute(
        "data-product-id",
        "ultimate-edition",
      );

      const rootOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(rootOverflow, `${locale.route} ${width}px root overflow`).toBe(0);

      if (width < 768) {
        const launcher = page.locator(
          'button[aria-controls="customer-support-panel"]',
        );
        const productTargets = [
          previous,
          next,
          currentProduct(stage).getByRole("link"),
        ];
        const launcherBox = await launcher.boundingBox();
        expect(launcherBox).not.toBeNull();

        for (const target of productTargets) {
          const targetBox = await target.boundingBox();
          expect(targetBox).not.toBeNull();
          if (launcherBox && targetBox) {
            expect(
              boxesOverlap(launcherBox, targetBox),
              `${locale.route} ${width}px support overlap`,
            ).toBe(false);
          }
        }
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
}

for (const locale of locales) {
  test(`rapid switch keeps latest intent on ${locale.route}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFormalRoute(page, locale.route);

    const stage = page.locator(".redesign-home-product-stage");
    const previous = page.getByRole("button", { name: locale.previous });
    const next = page.getByRole("button", { name: locale.next });
    await stage.scrollIntoViewIfNeeded();

    await next.click();
    await next.click();
    await previous.click();

    await expect(currentProduct(stage)).toHaveCount(1);
    await expect(currentProduct(stage)).toHaveAttribute(
      "data-product-id",
      "infinitetalk",
    );
    await expect(currentProduct(stage)).toContainText(locale.secondName);
    await expect(currentProduct(stage)).not.toContainText("AI语音生成");
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("[data-product-layer]")).every(
        (layer) =>
          layer
            .getAnimations()
            .every((animation) => animation.playState === "finished"),
      ),
    );
    await expect(currentProduct(stage)).toHaveAttribute(
      "data-product-id",
      "infinitetalk",
    );
    await expect(stage.locator('[data-product-previous="true"]')).toHaveCount(
      0,
    );
    await expect(currentProduct(stage).locator("img")).toHaveAttribute(
      "data-media-status",
      "ready",
    );
  });
}

test("keyboard switching is instant and retains persistent-control focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");

  const stage = page.locator(".redesign-home-product-stage");
  const previous = page.getByRole("button", { name: "上一款产品" });
  const next = page.getByRole("button", { name: "下一款产品" });
  await stage.scrollIntoViewIfNeeded();

  await stage.focus();
  await stage.press("ArrowRight");
  await expect(stage).toBeFocused();
  await expect(stage).toHaveAttribute("data-motion-duration-ms", "0");
  await expect(stage).toHaveAttribute("data-motion-modality", "keyboard");
  await expect(stage).toHaveAttribute("data-motion-enter-transform", "none");
  await expect(currentProduct(stage)).toHaveAttribute(
    "data-product-id",
    "infinitetalk",
  );

  await next.focus();
  await next.press("Enter");
  await expect(next).toBeFocused();
  await expect(currentProduct(stage)).toHaveAttribute(
    "data-product-id",
    "ai-voice",
  );

  await previous.press("ArrowLeft");
  await expect(previous).toBeFocused();
  await expect(currentProduct(stage)).toHaveAttribute(
    "data-product-id",
    "infinitetalk",
  );

  const detailLink = currentProduct(stage).getByRole("link");
  await detailLink.focus();
  await detailLink.press("ArrowRight");
  await expect(detailLink).toBeFocused();
  await expect(currentProduct(stage)).toHaveAttribute(
    "data-product-id",
    "infinitetalk",
  );

  await stage.focus();
  await page.keyboard.press("Tab");
  await expect(previous).toBeFocused();
});

test("keyboard remains instant when reduced motion is enabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");

  const stage = page.locator(".redesign-home-product-stage");
  await stage.scrollIntoViewIfNeeded();
  await stage.focus();
  await stage.press("ArrowRight");

  await expect(stage).toHaveAttribute("data-motion-duration-ms", "0");
  await expect(stage).toHaveAttribute("data-motion-modality", "keyboard");
  await expect(stage).toHaveAttribute("data-motion-enter-transform", "none");
  await expect(currentProduct(stage)).toHaveAttribute(
    "data-product-id",
    "infinitetalk",
  );
});

test("reduced motion stays 80ms opacity-only", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const nativeAnimate = Element.prototype.animate;
    const recordedProperties: string[] = [];

    Object.defineProperty(window, "__enheProductStageAnimatedProperties", {
      value: recordedProperties,
    });
    Element.prototype.animate = function (
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      if (this.matches("[data-product-layer]")) {
        const metadataKeys = new Set([
          "offset",
          "computedOffset",
          "easing",
          "composite",
        ]);
        const frames = Array.isArray(keyframes)
          ? keyframes
          : keyframes
            ? [keyframes]
            : [];

        for (const frame of frames) {
          recordedProperties.push(
            ...Object.keys(frame).filter((key) => !metadataKeys.has(key)),
          );
        }
      }

      return nativeAnimate.call(this, keyframes, options);
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");

  const stage = page.locator(".redesign-home-product-stage");
  await stage.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "下一款产品" }).click();

  const animatedProperties = await page.evaluate(() => [
    ...((
      window as Window & {
        __enheProductStageAnimatedProperties?: string[];
      }
    ).__enheProductStageAnimatedProperties ?? []),
  ]);

  await expect(stage).toHaveAttribute("data-motion-duration-ms", "80");
  await expect(stage).toHaveAttribute("data-motion-modality", "reduced");
  await expect(stage).toHaveAttribute("data-motion-enter-transform", "none");
  await expect(stage).toHaveAttribute("data-motion-exit-transform", "none");
  expect([...new Set(animatedProperties)]).toEqual(["opacity"]);
});

for (const locale of locales) {
  test(`server HTML keeps only the default product on ${locale.route}`, async ({
    request,
  }) => {
    const response = await request.get(locale.route);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const serverMarkup = html.replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
    const productIds = [
      ...serverMarkup.matchAll(/data-product-id="([^"]+)"/g),
    ].map((match) => match[1]);

    expect(productIds).toEqual(["ultimate-edition"]);
  });
}
