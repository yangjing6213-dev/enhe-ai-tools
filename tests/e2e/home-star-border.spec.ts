import { expect, test } from "@playwright/test";

for (const [path, locale, width, destination] of [
  ["/", "zh", 320, "/software"],
  ["/en", "en", 1440, "/en/software"],
] as const) {
  test(`StarBorder is visible, animated and navigable in ${locale} at ${width}px`, async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: "enhe_locale", value: locale, url: baseURL! }]);
    await page.setViewportSize({ width, height: 844 });
    await page.goto(path);
    const link = page.locator(".redesign-home-hero .redesign-home-cta").first();
    const canvas = link.locator("canvas.star-border__light");
    await expect(link).toHaveAttribute("href", destination);
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect(canvas).toHaveCSS("pointer-events", "none");
    await expect(link).toHaveCSS("border-radius", "12px");
    await expect(link).toHaveCSS("background-color", "rgb(12, 12, 15)");
    await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.width)).toBeGreaterThan(96);
    const first = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
    await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).not.toBe(first);
    await link.hover();
    await expect(link).toHaveCSS("background-color", "rgb(12, 12, 15)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (locale === "zh") {
      await link.focus();
      await link.press("Enter");
    } else {
      await link.click();
    }
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
  });
}

test("StarBorder click adds a visible border pulse", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const link = page.locator(".redesign-home-hero .redesign-home-cta").first();
  const canvas = link.locator("canvas.star-border__light");
  await link.hover();
  await page.clock.runFor(3000);
  const brightness = () => canvas.evaluate((node: HTMLCanvasElement) => {
    const pixels = node.getContext("2d")!.getImageData(0, 0, node.width, node.height).data;
    let alpha = 0;
    for (let i = 3; i < pixels.length; i += 4) alpha += pixels[i];
    return alpha;
  });
  const before = await brightness();
  await link.evaluate((node) => node.addEventListener("click", (event) => event.preventDefault(), { once: true }));
  await link.click();
  await page.clock.runFor(32);
  expect(await brightness()).toBeGreaterThan(before * 1.1);
});

test("StarBorder stops drawing when offscreen or hidden and responds to reduced motion", async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.clearRect;
    const probe = window as typeof window & { starBorderDraws: number };
    probe.starBorderDraws = 0;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("star-border__light")) probe.starBorderDraws++;
      return original.apply(this, args);
    };
  });
  await page.goto("/");
  const draws = () => page.evaluate(() => (window as typeof window & { starBorderDraws: number }).starBorderDraws);
  const link = page.locator(".redesign-home-hero .redesign-home-cta").first();
  await expect.poll(draws).toBeGreaterThan(3);
  await page.locator(".redesign-footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const offscreen = await draws();
  await page.waitForTimeout(150);
  expect(await draws()).toBe(offscreen);
  await link.scrollIntoViewIfNeeded();
  await expect.poll(draws).toBeGreaterThan(offscreen);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hidden = await draws();
  await page.waitForTimeout(150);
  expect(await draws()).toBe(hidden);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(draws).toBeGreaterThan(hidden);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await link.hover();
  await page.waitForTimeout(350);
  const reduced = await draws();
  await page.waitForTimeout(150);
  expect(await draws()).toBe(reduced);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(draws).toBeGreaterThan(reduced);
});
