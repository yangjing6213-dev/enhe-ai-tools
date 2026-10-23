import { expect, test } from "@playwright/test";

test("featured products autoplay, pause for reading and focus, and resume automatically", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.install({ time: new Date("2026-10-23T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-23T00:00:01Z"));
  await page.goto("/");
  const section = page.locator(".redesign-home-products");
  const current = section.locator('[data-product-current="true"]');
  await expect(section.locator(".redesign-home-product-autoplay")).toHaveCount(0);
  await expect(section.locator(".redesign-home-products-heading")).toHaveCSS("text-align", "center");
  await expect(section.locator(".redesign-home-products-heading")).toHaveCSS("flex-direction", "column");
  expect(
    await section.locator(".redesign-home-products-eyebrow").evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBe(32);
  await expect(section.locator(".redesign-home-product-indicators")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await section.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(section).toHaveAttribute("data-auto-rotating", "true");
  await page.clock.runFor(1);
  const first = await current.getAttribute("data-product-id");
  // This test checks timer state, not every animation frame during the wait.
  await page.clock.fastForward(6100);
  await expect(current).not.toHaveAttribute("data-product-id", first!);
  const second = await current.getAttribute("data-product-id");

  await section.hover();
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  await page.clock.fastForward(12000);
  await expect(current).toHaveAttribute("data-product-id", second!);
  await page.mouse.move(0, 0);
  await expect(section).toHaveAttribute("data-auto-rotating", "true");
  await page.clock.fastForward(5900);
  await expect(current).toHaveAttribute("data-product-id", second!);
  await page.clock.fastForward(200);
  await expect(current).not.toHaveAttribute("data-product-id", second!);

  const stage = section.locator(".redesign-home-product-stage");
  await stage.focus();
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  await page.keyboard.press("ArrowRight");
  const manual = await current.getAttribute("data-product-id");
  await page.clock.fastForward(12000);
  await expect(current).toHaveAttribute("data-product-id", manual!);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.mouse.move(0, 0);
  await stage.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute("data-auto-rotating", "true");
  await page.clock.runFor(1);
  await page.clock.fastForward(6100);
  await expect(current).not.toHaveAttribute("data-product-id", manual!);

  const beforeHidden = await current.getAttribute("data-product-id");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  await page.clock.fastForward(12000);
  await expect(current).toHaveAttribute("data-product-id", beforeHidden!);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(section).toHaveAttribute("data-auto-rotating", "true");

  await page.locator(".redesign-header").scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  const offscreen = await current.getAttribute("data-product-id");
  await page.clock.fastForward(12000);
  await expect(current).toHaveAttribute("data-product-id", offscreen!);
});

test("reduced motion disables automatic rotation but keeps manual product selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-10-23T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-23T00:00:01Z"));
  await page.goto("/en");
  const section = page.locator(".redesign-home-products");
  await section.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  const current = section.locator('[data-product-current="true"]');
  await expect(section.locator(".redesign-home-product-autoplay")).toHaveCount(0);
  await page.clock.runFor(12000);
  await expect(current).toHaveAttribute("data-product-id", "ultimate-edition");
  await section.getByRole("button", { name: "Next product" }).click();
  await expect(current).toHaveAttribute("data-product-id", "infinitetalk");
});
