import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [1440, 1024, 768, 480, 390, 320] as const;
const locales = [
  {
    route: "/",
    previous: "上一款产品",
    next: "下一款产品",
    firstName: "无所不能版｜AI生成视频应用",
    secondName: "InfiniteTalk",
    thirdName: "AI语音生成",
  },
  {
    route: "/en",
    previous: "Previous product",
    next: "Next product",
    firstName: "Ultimate Edition | AI Video Generation Suite",
    secondName: "InfiniteTalk",
    thirdName: "Local AI Voice Generator",
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
    test(`showcase stays compact, borderless, and switchable on ${locale.route} at ${width}px`, async ({
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
      await stage.hover();
      await expect(page.locator(".redesign-home-products")).toHaveAttribute(
        "data-auto-rotating",
        "false",
      );

      const content = page.locator(".redesign-home-product-content");
      const widthRatio = await content.evaluate((element) => {
        const stageElement = element.closest(".redesign-home-product-stage");
        if (!stageElement) return 0;
        const stageStyle = window.getComputedStyle(stageElement);
        const stageContentWidth =
          stageElement.clientWidth -
          Number.parseFloat(stageStyle.paddingLeft) -
          Number.parseFloat(stageStyle.paddingRight);
        const sideMargin = window.innerWidth < 768
          ? 40
          : Math.min(80, Math.max(44, window.innerWidth * 0.06));
        return element.getBoundingClientRect().width / (stageContentWidth - 2 * sideMargin);
      });
      expect(widthRatio).toBeGreaterThan(0.73);
      expect(widthRatio).toBeLessThan(0.77);

      const frame = currentProduct(stage).locator(
        ".redesign-home-product-media-frame",
      );
      await expect(frame).toHaveCSS("border-top-width", "0px");
      await expect(frame).toHaveCSS("border-radius", "0px");
      await expect(frame).toHaveCSS("box-shadow", "none");
      await expect(frame).toHaveCSS("transition-duration", "0s");
      await expect(frame).toHaveCSS("transform", "none");

      await expect(currentProduct(stage)).toHaveAttribute(
        "data-product-id",
        "ultimate-edition",
      );
      await expect(currentProduct(stage)).toContainText(locale.firstName);
      await next.click();
      await expect(currentProduct(stage)).toHaveCount(1);
      await expect(currentProduct(stage)).toHaveAttribute(
        "data-product-id",
        "infinitetalk",
      );
      await expect(currentProduct(stage)).toContainText(locale.secondName);
      await expect(stage.locator('[data-product-previous="true"]')).toHaveCount(0);
      await expect(stage.locator("[data-motion-variant]")).toHaveCount(0);

      await previous.click();
      await expect(currentProduct(stage)).toHaveAttribute(
        "data-product-id",
        "ultimate-edition",
      );
      await stage.focus();
      await stage.press("ArrowRight");
      await expect(currentProduct(stage)).toHaveAttribute(
        "data-product-id",
        "infinitetalk",
      );
      await stage.getByRole("button", { name: locale.route === "/" ? "显示第 3 款产品" : "Show product 3" }).click();
      await expect(currentProduct(stage)).toHaveAttribute(
        "data-product-id",
        "ai-voice",
      );
      await expect(currentProduct(stage)).toContainText(locale.thirdName);

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

test("reduced motion keeps manual switching while pausing automatic switching", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/");

  const stage = page.locator(".redesign-home-product-stage");
  await stage.scrollIntoViewIfNeeded();
  await stage.hover();
  await expect(page.locator(".redesign-home-products")).toHaveAttribute(
    "data-auto-rotating",
    "false",
  );
  await page.getByRole("button", { name: "下一款产品" }).click();
  await expect(currentProduct(stage)).toHaveAttribute(
    "data-product-id",
    "infinitetalk",
  );
  await expect(currentProduct(stage)).toHaveCount(1);
  await expect(stage.locator('[data-product-previous="true"]')).toHaveCount(0);
});

for (const locale of locales) {
  test(`server HTML marks only the default product current on ${locale.route}`, async ({
    request,
  }) => {
    const response = await request.get(locale.route);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const serverMarkup = html.replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
    const currentProductIds = [
      ...serverMarkup.matchAll(
        /<div\b(?=[^>]*\bdata-product-current="true")[^>]*\bdata-product-id="([^"]+)"/g,
      ),
    ].map((match) => match[1]);

    expect(currentProductIds).toEqual(["ultimate-edition"]);
  });
}
