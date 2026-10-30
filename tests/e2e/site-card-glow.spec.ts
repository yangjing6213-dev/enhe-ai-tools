import { expect, test } from "@playwright/test";

for (const route of ["/about", "/en/about"]) {
  test(`top-level about cards stay static and compact on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.emulateMedia({ reducedMotion: "no-preference" });
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
    await expect(card).toHaveAttribute("data-top-level-card-static", "true");
    await expect(card).toHaveCSS("transform", "none");
    await expect(effect).toHaveCount(0);
    const edgeBounds = await card.boundingBox();
    await page.mouse.move(edgeBounds!.x + edgeBounds!.width - 2, edgeBounds!.y + edgeBounds!.height / 2);
    await expect.poll(async () => Number(await card.evaluate(node => node.style.getPropertyValue("--edge-proximity") || "0"))).toBe(0);
    await expect(effect).toHaveCount(0);
    const after = await card.boundingBox();
    expect(after!.width).toBe(before!.width);
    expect(after!.height).toBe(before!.height);
    await page.mouse.move(0, 0);
    await expect(effect).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    for (const item of await cards.all()) {
      expect(await item.evaluate(node => Array.from(node.querySelectorAll("h2, p")).every(text => text.scrollHeight <= text.clientHeight))).toBe(true);
    }
  });
}

test("top-level cards stay static while nested cards retain glow without affecting controls", async ({ page }) => {
  for (const route of ["/", "/ai-news", "/ai-trends", "/login"]) {
    await page.goto(route);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => {
      const section = document.createElement("div");
      section.id = "dynamic-glow-fixture";
      section.style.cssText = "position:fixed;top:100px;left:32px;z-index:10000;background:white";
      section.innerHTML = '<article id="outer-card" class="enhe-admin-card" style="padding:24px;width:360px;height:280px">Order card <div id="nested-ui-card" data-slot="card" style="padding:24px;width:280px;height:80px">UI card</div><div id="nested-account-card" class="rounded-xl border" style="padding:24px;width:280px;height:80px">Account card</div><button type="button">Action</button></article>';
      document.body.append(section);
    });
    const outer = page.locator("#outer-card");
    await outer.hover({ position: { x: 2, y: 12 } });
    await expect(outer).toHaveAttribute("data-top-level-card-static", "true");
    await expect(outer).toHaveCSS("transform", "none");
    await expect(page.locator(".enhe-edge-effect")).toHaveCount(0);
    for (const selector of ["#nested-ui-card", "#nested-account-card"]) {
      const card = page.locator(selector);
      await card.hover({ position: { x: 2, y: 40 } });
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

test("nested glow respects reduced motion and touch input", async ({ page }) => {
  await page.goto("/about");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => {
    const parent = document.createElement("article");
    parent.className = "enhe-admin-card";
    parent.style.cssText = "position:fixed;top:100px;left:32px;width:320px;height:180px;padding:24px;z-index:10000;background:white";
    parent.innerHTML = '<div id="nested-motion-card" data-slot="card" style="width:260px;height:100px;padding:24px">Nested card</div>';
    document.body.append(parent);
  });
  const card = page.locator("#nested-motion-card");
  await card.hover({ position: { x: 2, y: 50 } });
  await expect(page.locator(".enhe-edge-effect")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".enhe-edge-effect")).toBeHidden();
  await expect.poll(() => card.evaluate(node => node.style.getPropertyValue("--edge-proximity"))).toBe("0");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.mouse.move(0, 0);
  await card.dispatchEvent("pointermove", { pointerType: "touch", clientX: 10, clientY: 10 });
  await expect.poll(() => card.evaluate(node => node.style.getPropertyValue("--edge-proximity"))).toBe("0");
});

test("admin cards have no edge glow in the read-only local fixture", async ({ page, context, baseURL }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires the isolated local admin fixture.");
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL! }]);
  for (const route of ["/admin", "/admin/comments", "/admin/users", "/admin/geo-monitoring"]) {
    await page.goto(route);
    await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
    const card = page.locator("main .surface-panel, main .glass, main .admin-shell-card, main article, main .enhe-admin-card").first();
    await expect(card).toBeVisible();
    await card.hover({ position: { x: 3, y: 50 } });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator(".enhe-edge-effect")).toHaveCount(0);
    const decoratedCards = page.locator(".enhe-admin-shell .surface-panel, .enhe-admin-shell .glass, .enhe-admin-shell .admin-shell-card");
    for (const item of await decoratedCards.all()) {
      expect(await item.evaluate(node => getComputedStyle(node, "::after").content)).toBe("none");
    }
    const nav = page.locator(".admin-nav-link").first();
    await nav.focus();
    await expect(nav).toHaveCSS("outline-style", "solid");
    await expect(page.locator(".enhe-edge-effect")).toHaveCount(0);
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
