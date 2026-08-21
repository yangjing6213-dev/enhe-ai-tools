import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

type MotionMetric = {
  activeAnimations: number;
  animatedProperties: string[];
  clsDelta: number;
  detachedActiveAnimations: number;
};

const relevantSelector = [
  "[data-product-layer]",
  ".redesign-software-category-panel",
  ".redesign-software-category-overlay",
  ".redesign-mobile-drawer",
  ".redesign-menu-overlay",
].join(", ");

function collectJavaScriptAssets(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return collectJavaScriptAssets(path);
    return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
  });
}

async function installPerformanceCapture(page: Page) {
  await page.addInitScript(({ selector }) => {
    type CaptureWindow = Window & {
      __enheFinalAnimations?: Animation[];
      __enheFinalAnimatedProperties?: string[];
      __enheFinalLayoutShift?: number;
    };
    const captureWindow = window as CaptureWindow;
    captureWindow.__enheFinalAnimations = [];
    captureWindow.__enheFinalAnimatedProperties = [];
    captureWindow.__enheFinalLayoutShift = 0;

    const nativeAnimate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = nativeAnimate.call(this, keyframes, options);
      if (this.matches(selector)) {
        captureWindow.__enheFinalAnimations?.push(animation);
        const metadata = new Set([
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
          captureWindow.__enheFinalAnimatedProperties?.push(
            ...Object.keys(frame).filter((property) => !metadata.has(property)),
          );
        }
      }
      return animation;
    };

    try {
      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          captureWindow.__enheFinalLayoutShift =
            (captureWindow.__enheFinalLayoutShift ?? 0) +
            Number((entry as PerformanceEntry & { value?: number }).value ?? 0);
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      captureWindow.__enheFinalLayoutShift = Number.NaN;
    }
  }, { selector: relevantSelector });
}

async function openFormalRoute(page: Page, route: string) {
  await page.route("**/api/analytics", (request) =>
    request.fulfill({ status: 204 }),
  );
  const response = await page.goto(route, { waitUntil: "load" });
  expect(response?.status()).toBe(200);
}

async function layoutShift(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window & {
          __enheFinalLayoutShift?: number;
        }
      ).__enheFinalLayoutShift ?? Number.NaN,
  );
}

async function prepareInteractionBaseline(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
    );
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );

    const captureWindow = window as Window & {
      __enheFinalAnimations?: Animation[];
      __enheFinalAnimatedProperties?: string[];
    };
    captureWindow.__enheFinalAnimations = [];
    captureWindow.__enheFinalAnimatedProperties = [];
  });
}

async function waitForMotionToSettle(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ selector }) => {
          const captureWindow = window as Window & {
            __enheFinalAnimations?: Animation[];
          };
          const relevantAnimations = [
            ...new Set([
              ...(captureWindow.__enheFinalAnimations ?? []),
              ...document.getAnimations(),
            ]),
          ].filter((animation) => {
            const target = (animation.effect as KeyframeEffect | null)?.target;
            return target instanceof Element && target.matches(selector);
          });
          return relevantAnimations.filter((animation) =>
            ["pending", "running"].includes(animation.playState),
          ).length;
        },
        { selector: relevantSelector },
      ),
    )
    .toBe(0);
}

async function readMetric(page: Page, before: number): Promise<MotionMetric> {
  return page.evaluate(
    ({ baseline, selector }) => {
      const captureWindow = window as Window & {
        __enheFinalAnimations?: Animation[];
        __enheFinalAnimatedProperties?: string[];
        __enheFinalLayoutShift?: number;
      };
      const animations = [
        ...new Set([
          ...(captureWindow.__enheFinalAnimations ?? []),
          ...document.getAnimations(),
        ]),
      ].filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return target instanceof Element && target.matches(selector);
      });
      const metadata = new Set([
        "offset",
        "computedOffset",
        "easing",
        "composite",
      ]);
      const animatedProperties = new Set(
        captureWindow.__enheFinalAnimatedProperties ?? [],
      );
      for (const animation of animations) {
        const effect = animation.effect as KeyframeEffect | null;
        for (const frame of effect?.getKeyframes() ?? []) {
          for (const property of Object.keys(frame)) {
            if (!metadata.has(property)) animatedProperties.add(property);
          }
        }
      }
      const isActive = (animation: Animation) =>
        ["pending", "running"].includes(animation.playState);
      return {
        activeAnimations: animations.filter(isActive).length,
        animatedProperties: [...animatedProperties].sort(),
        clsDelta: (captureWindow.__enheFinalLayoutShift ?? Number.NaN) - baseline,
        detachedActiveAnimations: animations.filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          return target instanceof Element && !target.isConnected && isActive(animation);
        }).length,
      };
    },
    { baseline: before, selector: relevantSelector },
  );
}

function expectPerformanceMetric(metric: MotionMetric) {
  expect(Number.isFinite(metric.clsDelta)).toBe(true);
  expect(metric.clsDelta).toBeLessThanOrEqual(0.001);
  expect(metric.activeAnimations).toBe(0);
  expect(metric.detachedActiveAnimations).toBe(0);
  expect(metric.animatedProperties.every((property) =>
    ["opacity", "transform"].includes(property),
  )).toBe(true);
}

test("category layer has no relevant layout shift or animation residue", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installPerformanceCapture(page);
  await openFormalRoute(page, "/software");
  await prepareInteractionBaseline(page);
  const before = await layoutShift(page);
  const trigger = page.locator(".redesign-software-category-trigger");
  const panel = page.locator(".redesign-software-category-panel");
  await trigger.click();
  await expect(panel).toBeVisible();
  await waitForMotionToSettle(page);
  await expect(panel).toHaveCSS("opacity", "1");
  await expect(panel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await waitForMotionToSettle(page);
  const metric = await readMetric(page, before);
  expectPerformanceMetric(metric);
  expect(metric.animatedProperties).toEqual(["opacity", "transform"]);
  console.log(`FINAL_CATEGORY_PERFORMANCE=${JSON.stringify(metric)}`);
});

test("product stage has no relevant layout shift or animation residue", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installPerformanceCapture(page);
  await openFormalRoute(page, "/");
  await prepareInteractionBaseline(page);
  const before = await layoutShift(page);
  const stage = page.locator(".redesign-home-product-stage");
  await stage.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "下一款产品" }).click();
  await expect(page.locator('[data-product-current="true"]')).toHaveAttribute(
    "data-product-id",
    "infinitetalk",
  );
  await waitForMotionToSettle(page);
  await expect(page.locator('[data-product-previous="true"]')).toHaveCount(0);
  await expect(page.locator('[data-product-current="true"]')).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  const metric = await readMetric(page, before);
  expectPerformanceMetric(metric);
  expect(metric.animatedProperties).toEqual(["opacity", "transform"]);
  console.log(`FINAL_PRODUCT_STAGE_PERFORMANCE=${JSON.stringify(metric)}`);
});

test("mobile navigation has no relevant layout shift or animation residue", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installPerformanceCapture(page);
  await openFormalRoute(page, "/software");
  await prepareInteractionBaseline(page);
  const before = await layoutShift(page);
  const trigger = page.getByRole("button", { name: "菜单", exact: true });
  const drawer = page.locator(".redesign-mobile-drawer");
  await trigger.click();
  await expect(drawer).toBeVisible();
  await waitForMotionToSettle(page);
  await expect(drawer).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await waitForMotionToSettle(page);
  const metric = await readMetric(page, before);
  expectPerformanceMetric(metric);
  expect(metric.animatedProperties).toEqual(["opacity", "transform"]);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  console.log(`FINAL_MOBILE_NAV_PERFORMANCE=${JSON.stringify(metric)}`);
});

test("standalone formal routes exclude prototype code and preview routes", async ({
  page,
  request,
}) => {
  expect(process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER).toBe("1");
  const formalRoutes = [
    "/",
    "/en",
    "/software",
    "/en/software",
    "/robots.txt",
    "/sitemap.xml",
  ];
  const previewRoutes = [
    "/redesign-preview/motion",
    "/redesign-preview/motion/category-layer",
    "/redesign-preview/motion/product-stage",
    "/redesign-preview/motion/mobile-nav",
  ];
  const scriptUrls = new Set<string>();

  for (const route of formalRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    if (route.endsWith(".txt") || route.endsWith(".xml")) {
      expect(await page.locator("body").innerText()).not.toContain(
        "redesign-preview",
      );
      continue;
    }
    for (const source of await page.locator("script[src]").evaluateAll((scripts) =>
      scripts.map((script) => script.getAttribute("src")).filter(Boolean),
    )) {
      scriptUrls.add(new URL(source ?? "", page.url()).href);
    }
  }

  for (const route of previewRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(404);
  }

  expect(scriptUrls.size).toBeGreaterThan(0);

  const bundleParts: string[] = [];
  for (const url of scriptUrls) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    bundleParts.push(await response.text());
  }
  const staticAssetPaths = collectJavaScriptAssets(join(process.cwd(), ".next", "static"));
  expect(staticAssetPaths.length).toBeGreaterThan(0);
  const emittedStaticBundle = staticAssetPaths
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  const productionBundle = `${bundleParts.join("\n")}\n${emittedStaticBundle}`;
  expect(bundleParts).toHaveLength(scriptUrls.size);
  for (const marker of [
    "origin-aware-layer",
    "directional-slide",
    "directional-drawer",
  ]) {
    expect(productionBundle, `missing production marker ${marker}`).toContain(marker);
  }
  for (const marker of [
    "redesign-preview/motion",
    "motion-prototype",
    "phase-2c3c",
    "category-layer-prototype",
    "product-stage-prototype",
    "mobile-nav-prototype",
  ]) {
    expect(productionBundle, `prototype marker ${marker}`).not.toContain(marker);
  }
  console.log(`FINAL_PRODUCTION_SCRIPT_ASSET_COUNT=${scriptUrls.size}`);
});
