import { expect, test, type Page } from "@playwright/test";

const viewports = [1440, 1024, 768, 480, 390, 320] as const;
const locales = [
  { route: "/software", closeLabel: "关闭分类" },
  { route: "/en/software", closeLabel: "Close categories" },
] as const;

async function openFormalRoute(page: Page, route: string) {
  await page.route("**/api/analytics", (request) => request.fulfill({ status: 204 }));
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${route} response status`).toBe(200);
}

for (const width of viewports) {
  for (const { route, closeLabel } of locales) {
    test(`origin-aware category layer passes ${route} at ${width}px`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const isMobile = width < 768;
      await page.setViewportSize({ width, height: isMobile ? 844 : 900 });
      await openFormalRoute(page, route);
      const trigger = page.locator(".redesign-software-category-trigger");
      await trigger.click();

      const panel = page.locator(".redesign-software-category-panel");
      const overlay = page.locator(".redesign-software-category-overlay");
      await expect(panel).toBeVisible();
      await expect(overlay).toBeVisible();
      await expect(panel).toHaveAttribute("data-motion-variant", "origin-aware-layer");
      await expect(panel).toHaveAttribute(
        "data-motion-duration-ms",
        isMobile ? "230" : "190",
      );
      await expect(panel).toHaveAttribute("data-motion-modality", "pointer");
      await expect(panel).toHaveAttribute("data-motion-origin", "trigger");
      await expect(page.getByRole("button", { name: closeLabel })).toBeVisible();

      const state = await panel.evaluate((element) => {
        const trigger = document.querySelector<HTMLElement>(
          ".redesign-software-category-trigger",
        );
        const panelRect = element.getBoundingClientRect();
        const triggerRect = trigger?.getBoundingClientRect();
        const originX = Number.parseFloat(getComputedStyle(element).transformOrigin);

        return {
          ariaModal: element.getAttribute("aria-modal"),
          bodyOverflow: document.body.style.overflow,
          rootOverflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          originDelta:
            triggerRect === undefined
              ? Number.POSITIVE_INFINITY
              : Math.abs(
                  originX -
                    Math.min(
                      panelRect.width,
                      Math.max(0, triggerRect.left + triggerRect.width / 2 - panelRect.left),
                    ),
                ),
        };
      });

      expect(state.rootOverflow, `${route} ${width}px root overflow`).toBe(0);
      expect(state.ariaModal, `${route} ${width}px aria-modal`).toBe(
        isMobile ? "true" : null,
      );
      expect(state.bodyOverflow, `${route} ${width}px body scroll lock`).toBe(
        isMobile ? "hidden" : "",
      );
      if (!isMobile) {
        expect(state.originDelta, `${route} ${width}px trigger origin`).toBeLessThanOrEqual(1);
      }

      if (width === 390 || width === 320) {
        const launcher = page.locator(
          'button[aria-controls="customer-support-panel"]',
        );
        const launcherRect = await launcher.boundingBox();
        expect(launcherRect).not.toBeNull();
        const hitCategory = await page.evaluate(({ x, y }) => {
          const target = document.elementFromPoint(x, y);
          return Boolean(
            target?.closest(
              ".redesign-software-category-overlay, .redesign-software-category-panel",
            ),
          );
        }, {
          x: (launcherRect?.x ?? 0) + (launcherRect?.width ?? 0) / 2,
          y: (launcherRect?.y ?? 0) + (launcherRect?.height ?? 0) / 2,
        });
        expect(hitCategory, `${route} ${width}px support collision`).toBe(true);
      }

      await page.mouse.click(8, Math.floor((isMobile ? 844 : 900) / 2));
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
}

test("pre-navigation reduced motion hydrates cleanly and stays opacity-only", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormalRoute(page, "/software");

  const trigger = page.locator(".redesign-software-category-trigger");
  const panel = page.locator(".redesign-software-category-panel");
  await trigger.click();
  await expect(panel).toHaveAttribute("data-motion-duration-ms", "80");
  await expect(panel).toHaveAttribute("data-motion-modality", "reduced");
  await expect(panel).toHaveAttribute("data-motion-enter-transform", "none");

  await page.getByRole("button", { name: "关闭分类" }).click();
  await expect(panel).toBeHidden();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("keyboard and reduced-motion profiles stay fast, transform-free, and focus-safe", async ({
  page,
}) => {
  for (const { route, closeLabel } of locales) {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFormalRoute(page, route);

    const trigger = page.locator(".redesign-software-category-trigger");
    const panel = page.locator(".redesign-software-category-panel");

    await trigger.click();
    await expect(panel).toHaveAttribute("data-motion-duration-ms", "230");
    await page.keyboard.press("Escape");
    await expect(panel).toHaveAttribute("data-motion-duration-ms", "100");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.focus();
    await trigger.press("Enter");
    await expect(panel).toHaveAttribute("data-motion-duration-ms", "100");
    await expect(panel).toHaveAttribute("data-motion-modality", "keyboard");
    await expect(panel).toHaveAttribute("data-motion-enter-transform", "none");

    const closeButton = page.getByRole("button", { name: closeLabel });
    const categoryButtons = panel.locator(".redesign-software-category-button");
    await closeButton.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(categoryButtons.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.press("Space");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-motion-duration-ms", "100");
    await closeButton.press("Enter");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await trigger.click();
    await expect(panel).toHaveAttribute("data-motion-duration-ms", "80");
    await expect(panel).toHaveAttribute("data-motion-modality", "reduced");
    await expect(panel).toHaveAttribute("data-motion-enter-transform", "none");
    await closeButton.click();
    await expect(panel).toBeHidden();
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
});
