import { expect, test } from "@playwright/test";

test("folder closes when Escape immediately follows native summary activation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const folder = page.locator(".redesign-home-features .folder-float").first();
  // Confirm hydration and begin with React state and the native details element both closed.
  await folder.hover();
  await expect(folder).toHaveAttribute("data-open", "");
  await folder.locator(".folder-float__trigger").focus();
  await page.keyboard.press("Escape");
  await page.mouse.move(0, 0);
  await expect(folder).not.toHaveAttribute("data-open");
  await expect(folder).not.toHaveAttribute("open");

  const state = await folder.evaluate((node: HTMLDetailsElement) => {
    const summary = node.querySelector<HTMLElement>("summary")!;
    // A native toggle changes .open before its queued toggle event updates React state.
    summary.click();
    const opened = node.open;
    summary.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return { opened, closed: !node.open };
  });
  expect(state).toEqual({ opened: true, closed: true });
  await expect(folder).not.toHaveAttribute("open");
});

for (const route of ["/", "/en"]) {
  test(`homepage folder text is centered inside each floating label on ${route}`, async ({ page }) => {
    for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(route);
      if (viewport.width < 768) {
        await expect(page.locator(".redesign-home-features")).toBeHidden();
        const mobileCards = page.locator(".redesign-home-mobile-cards a");
        await expect(mobileCards).toHaveCount(3);
        for (const [index, path] of ["/software", "/forum", "/ai-news"].entries()) {
          await expect(mobileCards.nth(index)).toBeVisible();
          await expect(mobileCards.nth(index)).toHaveAttribute("href", `${route === "/en" ? route : ""}${path}`);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        await page.screenshot({ path: test.info().outputPath(`mobile-explore-${viewport.width}.png`) });
        continue;
      }
      const folders = page.locator(".redesign-home-features .folder-float");
      await expect(folders).toHaveCount(4);

      for (const [index, folder] of (await folders.all()).entries()) {
        await folder.locator(".folder-float__trigger").hover();
        await expect(folder).toHaveAttribute("open", "");
        await expect(folder).toHaveAttribute("data-live", "");

        const geometry = await folder.evaluate(node => {
          const items = [...node.querySelectorAll<HTMLElement>(".folder-float__item")];
          return items.map(item => {
            const bounds = item.getBoundingClientRect();
            const text = item.querySelector(".folder-float__drift")!.getBoundingClientRect();
            return {
              label: item.textContent,
              horizontalOffset: Math.abs((text.left + text.right - bounds.left - bounds.right) / 2),
              verticalOffset: Math.abs((text.top + text.bottom - bounds.top - bounds.bottom) / 2),
            };
          });
        });

        expect(geometry.length).toBeGreaterThan(0);
        for (const item of geometry) {
          expect(item.verticalOffset, `${item.label}: vertical centering`).toBeLessThanOrEqual(1);
          expect(item.horizontalOffset, `${item.label}: horizontal centering`).toBeLessThanOrEqual(1);
        }
        if (index === 0) await page.screenshot({ path: test.info().outputPath(`label-centering-${viewport.width}.png`) });
      }
    }
  });

  test(`blue folders keep their design with the requested larger hero spacing on ${route}`, async ({ page }) => {
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto(route);
      await expect(page.locator(".redesign-home-feature-card")).toHaveCount(0);
      const folders = page.locator(".redesign-home-features .folder-float");
      await expect(folders).toHaveCount(4);
      for (const folder of await folders.all()) {
        const folderShape = folder.locator(".folder-float__folder");
        const front = folder.locator(".folder-float__front");
        await expect(folderShape).toBeVisible();
        const frontBounds = (await front.boundingBox())!;
        expect(frontBounds.width).toBeGreaterThan(180);
        expect(frontBounds.height).toBeGreaterThan(90);
        const bounds = (await folder.boundingBox())!;
        expect(bounds.y).toBeGreaterThan(0);
        expect(await folder.evaluate(node => node.style.getPropertyValue("--ff-back"))).toBe("#f5f5f5");
        expect(await folder.evaluate(node => node.style.getPropertyValue("--ff-front"))).toBe("#3b82f6");
        await expect(folder.locator(".folder-float__label")).toHaveCSS("color", "rgb(245, 245, 245)");
      }
      await expect(page.locator(".redesign-home-subtitle")).toHaveCSS("margin-top", "48px");
      const spacing = await page.locator(".redesign-home-hero-inner").evaluate(node => ({ top: parseFloat(getComputedStyle(node).paddingTop), bottom: parseFloat(getComputedStyle(node).paddingBottom) }));
      expect(spacing.top).toBeCloseTo(Math.min(148.72, viewport.width * 0.1014), 1);
      expect(spacing.bottom).toBeCloseTo(Math.min(105.6, viewport.width * 0.072), 1);
      await expect(page.locator(".redesign-home-features-inner")).toHaveCSS("padding-top", "28.8px");
      await page.screenshot({ path: test.info().outputPath(`first-screen-${viewport.width}.png`) });
    }
  });
}

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
    await section.dispatchEvent("mouseenter");
    await expect(section.locator(".redesign-home-reviews-track")).toHaveAttribute("aria-live", "off");
    for (let step = 0; step < 2; step++) {
      const before = await current.getAttribute("aria-label");
      await page.clock.fastForward(2900);
      await expect(current).toHaveAttribute("aria-label", before!);
      await page.clock.fastForward(100);
      await expect(current).not.toHaveAttribute("aria-label", before!);
    }
    await control.evaluate((node: HTMLButtonElement) => node.click());
    await expect(control).toHaveAttribute("aria-pressed", "true");
    const paused = await current.getAttribute("aria-label");
    // No carousel tick is expected while paused. Check each period instead of
    // replaying every unrelated animation frame or allowing a full-cycle alias.
    for (let step = 0; step < 3; step++) {
      await page.clock.fastForward(3000);
      await expect(current).toHaveAttribute("aria-label", paused!);
    }
  });
}

for (const route of ["/", "/en"]) {
  for (const width of [320, 768, 1440]) {
    test(`product layout stays fixed and navigation works on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(route);
      await page.addStyleTag({ content: "html { scroll-behavior: auto !important }" });
      const stage = page.locator(".redesign-home-product-stage");
      await stage.focus();
      const geometry = () => stage.evaluate(node => {
        const current = node.querySelector('[data-product-current="true"]')!;
        const stageBox = node.getBoundingClientRect();
        const frame = current.querySelector('.redesign-home-product-media-frame')!.getBoundingClientRect();
        const detail = current.querySelector('.redesign-home-product-detail')!.getBoundingClientRect();
        return { height: stageBox.height, frameHeight: frame.height, detailTop: detail.top - stageBox.top, detailHeight: detail.height };
      });
      const before = await geometry();
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("ArrowRight");
        expect(await geometry()).toEqual(before);
        await expect(stage.locator('[data-product-current="true"] img')).toHaveCSS("object-fit", "contain");
      }
      if (width < 768) {
        await expect(page.locator(".redesign-home-features")).toBeHidden();
        const cards = page.locator(".redesign-home-mobile-cards a");
        await expect(cards).toHaveCount(3);
        await expect(cards.first()).toHaveAttribute("href", route === "/en" ? "/en/software" : "/software");
        await cards.first().click();
        await expect(page).toHaveURL(route === "/en" ? /\/en\/software$/ : /\/software$/);
        return;
      }
      const folders = page.locator(".redesign-home-features .folder-float");
      await expect(folders).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (width === 1440) await page.locator(".redesign-home-features").screenshot({ path: test.info().outputPath("folders.png") });
      const folder = folders.first();
      await folder.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
      await page.mouse.move(0, 0);
      await folder.dispatchEvent("pointerenter", { pointerType: "touch" });
      await expect(folder).not.toHaveAttribute("data-open");
      const trigger = folder.locator(".folder-float__trigger");
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(folder).toHaveAttribute("open", "");
      await page.keyboard.press("Escape");
      await expect(folder).not.toHaveAttribute("open", "");
      await folder.hover();
      await expect(folder).toHaveAttribute("open", "");
      await expect(folder).toHaveAttribute("data-live", "");
      await folder.locator(".folder-float__item").first().click();
      await expect(page).toHaveURL(route === "/" ? /\/software\?category=video$/ : /\/en\/software\?category=video$/);
    });
  }
}

test("product indicators select the matching borderless product without mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const stage = page.locator(".redesign-home-product-stage");
  await stage.scrollIntoViewIfNeeded();
  const indicators = stage.locator(".redesign-home-product-indicators button");
  await expect(indicators).toHaveCount(5);

  await indicators.nth(4).click();
  await expect(stage.locator('[data-product-current="true"]')).toHaveAttribute("data-product-id", "faceswap-studio");
  await expect(indicators.nth(4)).toHaveAttribute("aria-current", "true");
  await expect(stage.locator('[data-product-current="true"] .redesign-home-product-media-frame')).toHaveCSS("border-radius", "0px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test("mobile exploration cards remain usable on a touch screen with reduced motion", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true, reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/en`);
    await expect(page.locator(".redesign-home-features")).toBeHidden();
    const cards = page.locator(".redesign-home-mobile-cards a");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toHaveAttribute("href", "/en/software");
    await cards.nth(0).tap();
    await expect(page).toHaveURL(/\/en\/software$/);
  } finally { await context.close(); }
});
