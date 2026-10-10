import { expect, test } from "@playwright/test";

test("featured products rotate, pause for reading and focus, and resume with a fresh interval", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const section = page.locator(".redesign-home-products");
  const current = section.locator('[data-product-current="true"]');
  await section.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(section).toHaveAttribute("data-auto-rotating", "true");
  const first = await current.getAttribute("data-product-id");
  await page.clock.runFor(6100);
  await expect(current).not.toHaveAttribute("data-product-id", first!);
  const second = await current.getAttribute("data-product-id");

  await section.hover();
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  await page.clock.runFor(12000);
  await expect(current).toHaveAttribute("data-product-id", second!);
  await page.mouse.move(0, 0);
  await expect(section).toHaveAttribute("data-auto-rotating", "true");
  await page.clock.runFor(5900);
  await expect(current).toHaveAttribute("data-product-id", second!);
  await page.clock.runFor(200);
  await expect(current).not.toHaveAttribute("data-product-id", second!);

  const stage = section.locator(".redesign-home-product-stage");
  await stage.focus();
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  await page.keyboard.press("ArrowRight");
  const manual = await current.getAttribute("data-product-id");
  await page.clock.runFor(12000);
  await expect(current).toHaveAttribute("data-product-id", manual!);
  await section.getByRole("button", { name: "暂停产品轮播" }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.mouse.move(0, 0);
  await page.clock.runFor(6100);
  await expect(current).toHaveAttribute("data-product-id", manual!);
  await section.getByRole("button", { name: "继续产品轮播" }).click();
  await stage.scrollIntoViewIfNeeded();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.mouse.move(0, 0);
  await expect(section).toHaveAttribute("data-auto-rotating", "true");
  await page.clock.runFor(6100);
  await expect(current).not.toHaveAttribute("data-product-id", manual!);

  const beforeHidden = await current.getAttribute("data-product-id");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  await page.clock.runFor(12000);
  await expect(current).toHaveAttribute("data-product-id", beforeHidden!);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(section).toHaveAttribute("data-auto-rotating", "true");

  await page.locator(".redesign-header").scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  const offscreen = await current.getAttribute("data-product-id");
  await page.clock.runFor(12000);
  await expect(current).toHaveAttribute("data-product-id", offscreen!);
});

test("reduced motion disables automatic rotation but keeps manual product selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/en");
  const section = page.locator(".redesign-home-products");
  await section.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(section).toHaveAttribute("data-auto-rotating", "false");
  const current = section.locator('[data-product-current="true"]');
  await page.clock.runFor(12000);
  await expect(current).toHaveAttribute("data-product-id", "ultimate-edition");
  await section.getByRole("button", { name: "Next product" }).click();
  await expect(current).toHaveAttribute("data-product-id", "infinitetalk");
  await expect(section.getByRole("button", { name: "Pause product slideshow" })).toBeDisabled();
});
