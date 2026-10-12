import { expect, test } from "@playwright/test";

for (const route of ["/about", "/en/about"]) {
  test(`About cards are compact and glow at the edges on ${route}`, async ({ page }) => {
    await page.goto(route);
    // Pointer coordinates must stay stable; this test is not a scroll animation test.
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
    const cards = page.locator(".about-section-grid .enhe-reference-editorial-card");
    await expect(cards).toHaveCount(5);
    const card = cards.first();
    await card.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const before = await card.boundingBox();
    expect(before!.height).toBeLessThan(340);
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    const effect = page.locator(".enhe-edge-effect");
    await expect(effect).toHaveCount(1);
    await expect(effect).toHaveCSS("pointer-events", "none");
    await expect(effect).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect.poll(() => card.evaluate(node => Number(node.style.getPropertyValue("--edge-proximity")))).toBeLessThan(1);
    const edgeBounds = await card.boundingBox();
    await page.mouse.move(edgeBounds!.x + edgeBounds!.width - 2, edgeBounds!.y + edgeBounds!.height / 2);
    await expect.poll(() => card.evaluate(node => Number(node.style.getPropertyValue("--edge-proximity")))).toBeGreaterThan(95);
    await expect.poll(() => effect.evaluate(node => Number(getComputedStyle(node, "::before").opacity))).toBeGreaterThan(0.8);
    const after = await card.boundingBox();
    expect(after!.width).toBe(before!.width);
    expect(after!.height).toBe(before!.height);
    await page.mouse.move(0, 0);
    await expect.poll(() => effect.evaluate(node => Number(getComputedStyle(node, "::before").opacity))).toBe(0);
    await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    for (const item of await cards.all()) {
      expect(await item.evaluate(node => Array.from(node.querySelectorAll("h2, p")).every(text => text.scrollHeight <= text.clientHeight))).toBe(true);
    }
  });
}

test("glow reaches public cards and dynamic account/admin cards without affecting controls", async ({ page }) => {
  for (const route of ["/", "/ai-news", "/ai-trends", "/login"]) {
    await page.goto(route);
    await page.evaluate(() => {
      const section = document.createElement("div");
      section.id = "dynamic-glow-fixture";
      section.style.cssText = "position:fixed;top:100px;left:32px;z-index:10000;background:white";
      section.innerHTML = '<article class="enhe-admin-card" style="padding:24px;width:280px;height:160px">Order card <button type="button">Action</button></article><div class="rounded-xl border" style="padding:24px;width:280px;height:160px">Account card</div><div data-slot="card" style="padding:24px;width:280px;height:160px">UI card</div>';
      document.body.append(section);
    });
    for (const selector of ["article.enhe-admin-card", ".rounded-xl.border", '[data-slot="card"]']) {
      const card = page.locator(`#dynamic-glow-fixture ${selector}`);
      await card.hover({ position: { x: 2, y: 80 } });
      await expect(page.locator(".enhe-edge-effect")).toHaveCount(1);
    }
    const button = page.locator("#dynamic-glow-fixture button");
    await button.evaluate(node => node.addEventListener("click", () => node.setAttribute("data-clicked", "yes")));
    await button.click();
    await expect(button).toHaveAttribute("data-clicked", "yes");
    await expect(button.locator(".enhe-edge-effect")).toHaveCount(0);
    await page.locator("#dynamic-glow-fixture").evaluate(node => node.remove());
    await expect(page.locator(".enhe-edge-effect")).toHaveCount(0);
  }
});

test("touch and reduced motion disable the glow immediately", async ({ page }) => {
  await page.goto("/about");
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
  const card = page.locator(".about-section-grid article").first();
  await card.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const bounds = (await card.boundingBox())!;
  await page.mouse.move(bounds.x + 2, bounds.y + 60);
  await expect(page.locator(".enhe-edge-effect")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".enhe-edge-effect")).toBeHidden();
  await expect.poll(() => card.evaluate(node => node.style.getPropertyValue("--edge-proximity"))).toBe("0");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.mouse.move(0, 0);
  await card.dispatchEvent("pointermove", { pointerType: "touch", clientX: 10, clientY: 10 });
  await expect.poll(() => card.evaluate(node => node.style.getPropertyValue("--edge-proximity"))).toBe("0");
});

test("admin cards use the same effect in the read-only local fixture", async ({ page, context, baseURL }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires the isolated local admin fixture.");
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL! }]);
  for (const route of ["/admin", "/admin/comments", "/admin/users", "/admin/geo-monitoring"]) {
    await page.goto(route);
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
    const card = page.locator("main .surface-panel, main .glass, main .admin-shell-card, main article, main .enhe-admin-card").first();
    await expect(card).toBeVisible();
    await card.hover({ position: { x: 3, y: 50 } });
    await expect(page.locator(".enhe-edge-effect")).toBeVisible();
    await expect(page.locator(".enhe-edge-effect")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".enhe-edge-effect")).toHaveCSS("pointer-events", "none");
  }
});

test("a real touch viewport keeps cards static and within the screen", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/about`);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    const card = page.locator(".about-section-grid article").first();
    await card.tap();
    await expect(page.locator(".enhe-edge-effect")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  } finally {
    await context.close();
  }
});
