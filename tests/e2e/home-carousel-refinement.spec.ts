import { expect, test } from "@playwright/test";

for (const route of ["/", "/en"]) {
  test(`product showcase has no edge glow on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
    const stage = page.locator(".redesign-home-product-stage");
    await stage.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const bounds = (await stage.boundingBox())!;
    await page.mouse.move(bounds.x + 3, bounds.y + bounds.height / 2);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator(".enhe-edge-effect")).toHaveCount(0);
    expect(await stage.evaluate(node => node.style.getPropertyValue("--edge-proximity"))).toBe("");
    // A card-shaped descendant must not re-enable the showcase glow.
    await stage.evaluate(node => {
      const child = document.createElement("article");
      child.id = "showcase-glow-exclusion-fixture";
      child.style.cssText = "position:absolute;left:0;top:40%;width:80px;height:80px;z-index:100";
      node.append(child);
    });
    await page.locator("#showcase-glow-exclusion-fixture").hover();
    await expect(page.locator(".enhe-edge-effect")).toHaveCount(0);
  });

  test(`feedback advances every three seconds and still pauses on ${route}`, async ({ page }) => {
    await page.clock.install();
    await page.goto(route);
    const section = page.locator(".redesign-home-reviews");
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const current = section.locator('[data-active="true"]');
    const control = section.locator(".redesign-home-reviews-rotation");
    // Start a fresh interval after hydration, without moving the pointer or focus.
    await control.evaluate((node: HTMLButtonElement) => node.click());
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await control.evaluate((node: HTMLButtonElement) => node.click());
    await expect(control).toHaveAttribute("aria-pressed", "false");
    for (let step = 0; step < 2; step++) {
      const before = await current.getAttribute("aria-label");
      await page.clock.runFor(2900);
      await expect(current).toHaveAttribute("aria-label", before!);
      await page.clock.runFor(100);
      await expect(current).not.toHaveAttribute("aria-label", before!);
    }
    await control.evaluate((node: HTMLButtonElement) => node.click());
    await expect(control).toHaveAttribute("aria-pressed", "true");
    const paused = await current.getAttribute("aria-label");
    await page.clock.runFor(9000);
    await expect(current).toHaveAttribute("aria-label", paused!);
  });
}
