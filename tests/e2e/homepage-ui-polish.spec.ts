import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function installLoopbackOnlyGuard(page: Page) {
  const rejectedOrigins: string[] = [];
  const localOrigin = `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

  await page.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin === localOrigin) {
      await route.continue();
      return;
    }
    rejectedOrigins.push(origin);
    await route.abort();
  });

  return rejectedOrigins;
}

test("homepage polish stays readable, responsive, and interactive without external services", async ({ page }) => {
  if (process.env.DATABASE_URL?.trim()) {
    throw new Error("Homepage UI checks require an unset DATABASE_URL.");
  }

  const rejectedOrigins = await installLoopbackOnlyGuard(page);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const width of [1440, 1024, 900, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/", { waitUntil: "load" });
    expect(response?.status(), `homepage at ${width}px`).toBe(200);

    const brand = page.locator(".redesign-brand-lockup");
    const brandLabel = page.locator(".redesign-header[data-home='true'] .redesign-brand-label");
    const hero = page.locator(".redesign-home-hero");
    await expect(brand).toBeVisible();
    await expect(brandLabel).toHaveText("给你的人生添加AI外挂");
    await expect(brandLabel).toBeVisible();
    await expect(hero.locator(".redesign-home-hero-inner")).toHaveCSS("text-align", "center");
    await expect(hero).toHaveCSS("background-image", "none");
    await expect(hero).toHaveCSS("color", "rgb(16, 24, 40)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    const brandAlignment = await page.evaluate(() => {
      const logo = document.querySelector<HTMLElement>(".redesign-brand-lockup");
      const label = document.querySelector<HTMLElement>(".redesign-header[data-home='true'] .redesign-brand-label");
      if (!logo || !label) throw new Error("The homepage brand lockup is missing.");
      const logoRect = logo.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const actionProbe = document.createElement("span");
      actionProbe.style.backgroundColor = "var(--enhe-action)";
      document.body.append(actionProbe);
      const actionBackground = getComputedStyle(actionProbe).backgroundColor;
      actionProbe.remove();
      return {
        centerDifference: Math.abs(logoRect.left + logoRect.width / 2 - (labelRect.left + labelRect.width / 2)),
        logoWidth: logoRect.width,
        labelBackground: getComputedStyle(label).backgroundColor,
        actionBackground,
      };
    });
    expect(brandAlignment.centerDifference, `brand line center alignment at ${width}px`).toBeLessThanOrEqual(1);
    expect(brandAlignment.logoWidth, `restored logo width at ${width}px`).toBeGreaterThanOrEqual(150);
    expect(brandAlignment.labelBackground, `brand line background at ${width}px`).toBe(brandAlignment.actionBackground);

    if (width < 768) {
      const layout = await page.locator(".redesign-header-inner").evaluate((inner) => {
        const rect = (selector: string) => {
          const element = inner.querySelector<HTMLElement>(selector);
          if (!element) throw new Error(`Missing mobile header element: ${selector}`);
          const { x, width, right } = element.getBoundingClientRect();
          return { x, width, right };
        };
        const languageSwitch = Array.from(
          inner.querySelectorAll<HTMLElement>(".redesign-language-switch"),
        ).find((element) => element.getBoundingClientRect().width > 0);
        if (!languageSwitch) throw new Error("The mobile language switch is missing.");
        const languageRect = languageSwitch.getBoundingClientRect();
        return {
          innerRight: inner.getBoundingClientRect().right,
          brand: rect(".redesign-brand-region"),
          logo: rect(".redesign-brand-mark"),
          label: rect(".redesign-brand-label"),
          actions: rect(".redesign-mobile-actions"),
          menu: rect(".redesign-menu-trigger"),
          language: {
            x: languageRect.x,
            width: languageRect.width,
            right: languageRect.right,
          },
        };
      });
      expect(
        layout.actions.right,
        `mobile header controls stay inside the header at ${width}px: ${JSON.stringify(layout)}`,
      ).toBeLessThanOrEqual(
        layout.innerRight + 1,
      );
    }

    const featureCards = page.locator(".redesign-home-feature-card");
    await expect(featureCards).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      for (const borderProperty of ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"]) {
        await expect(featureCards.nth(index)).toHaveCSS(borderProperty, "0px");
      }
    }

    const productHeading = page.locator(".redesign-home-products-heading h2");
    const headingFitsOneLine = await productHeading.evaluate((element) => {
      const style = getComputedStyle(element);
      return element.getBoundingClientRect().height <= Number.parseFloat(style.lineHeight) + 1 &&
        element.scrollWidth <= element.clientWidth;
    });
    expect(headingFitsOneLine, `product heading stays on one line at ${width}px`).toBe(true);
    await expect(page.locator(".redesign-home-product-counter")).toHaveCount(0);
    await expect(page.locator(".redesign-home-product-stage [aria-live='polite'][aria-atomic='true']")).toHaveCount(1);

    const productArrowAlignment = await page.evaluate(() => {
      const controls = document.querySelector<HTMLElement>(".redesign-home-product-controls");
      const card = document.querySelector<HTMLElement>(".redesign-home-product-media-frame");
      const arrows = controls?.querySelectorAll<HTMLElement>(".redesign-home-product-control");
      const previous = arrows?.[0];
      const next = arrows?.[1];
      if (!previous || !next || !card) throw new Error("The product card or side arrows are missing.");
      const previousRect = previous.getBoundingClientRect();
      const nextRect = next.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return Math.abs(
        previousRect.top + previousRect.height / 2 - (cardRect.top + cardRect.height / 2),
      ) <= 8 && previousRect.right <= cardRect.left && nextRect.left >= cardRect.right;
    });
    expect(productArrowAlignment, `product arrows sit outside and center on the cover at ${width}px`).toBe(true);
    const currentProductTitle = page.locator('[data-product-current="true"] .redesign-home-product-detail h3');
    const initialProductTitle = await currentProductTitle.textContent();
    await page.getByRole("button", { name: "下一款产品" }).click();
    await expect.poll(() => currentProductTitle.textContent()).not.toBe(initialProductTitle);
    await page.getByRole("button", { name: "上一款产品" }).click();
    await expect.poll(() => currentProductTitle.textContent()).toBe(initialProductTitle);

    const reviews = page.locator(".redesign-home-reviews");
    await reviews.scrollIntoViewIfNeeded();
    await reviews.hover();
    await expect(reviews.locator(".redesign-home-review-triangle")).toHaveCount(2);
    const reviewArrowAlignment = await reviews.evaluate((section) => {
      const arrows = section.querySelectorAll<HTMLElement>(".redesign-home-reviews-control");
      const card = section.querySelector<HTMLElement>('.redesign-home-review-card[data-position="0"]');
      if (!arrows[0] || !arrows[1] || !card) throw new Error("The active review card or side arrows are missing.");
      const previous = arrows[0].getBoundingClientRect();
      const next = arrows[1].getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const previousStyle = getComputedStyle(arrows[0]);
      const previousHitTarget = document.elementFromPoint(
        previous.left + previous.width / 2,
        previous.top + previous.height / 2,
      );
      return {
        verticallyCentered: Math.abs(previous.top + previous.height / 2 - (cardRect.top + cardRect.height / 2)) <= 8,
        outsideCard: previous.right <= cardRect.left && next.left >= cardRect.right,
        visible: previous.width > 0 && previous.height > 0 && previousStyle.visibility === "visible" && Number(previousStyle.opacity) > 0,
        background: previousStyle.backgroundColor,
        receivesPointer: previousHitTarget === arrows[0] || arrows[0].contains(previousHitTarget),
      };
    });
    expect(reviewArrowAlignment, `review arrows remain visible, clickable, outside, and centered at ${width}px`).toEqual({
      verticallyCentered: true,
      outsideCard: true,
      visible: true,
      background: "rgb(255, 255, 255)",
      receivesPointer: true,
    });
    const activeReviewQuote = reviews.locator('.redesign-home-review-card[data-position="0"] blockquote');
    const initialReviewQuote = await activeReviewQuote.textContent();
    await reviews.getByRole("button", { name: "下一条评价" }).click();
    await expect.poll(() => activeReviewQuote.textContent()).not.toBe(initialReviewQuote);
    await reviews.getByRole("button", { name: "上一条评价" }).click();
    await expect.poll(() => activeReviewQuote.textContent()).toBe(initialReviewQuote);
    const reviewAvatar = reviews.locator('.redesign-home-review-card[data-position="0"] .redesign-home-review-avatar');
    await expect(reviewAvatar).toHaveAttribute("alt", /AI 生成的虚构人物/);
    const pauseRotation = reviews.getByRole("button", { name: "暂停自动播放" });
    await expect(pauseRotation).toHaveAttribute("aria-pressed", "false");
    await pauseRotation.click();
    await expect(reviews.getByRole("button", { name: "继续自动播放" })).toHaveAttribute("aria-pressed", "true");

    const footer = page.locator(".redesign-footer");
    await expect(footer).toHaveCSS("background-color", "rgb(0, 21, 18)");
    const footerGroup = footer.locator("details.footer-group").first();
    await expect(footerGroup).not.toHaveAttribute("open", "");
    await footerGroup.locator("summary").click();
    await expect(footerGroup).toHaveAttribute("open", "");
    await footerGroup.locator("summary").click();
    await expect(footerGroup).not.toHaveAttribute("open", "");
    await expect(footer.getByRole("link", { name: "回到顶部" })).toHaveAttribute("href", "#top");
    const backToTopPlacement = await footer.evaluate((element) => {
      const button = element.querySelector<HTMLElement>(".footer-back-to-top-button");
      const inner = element.querySelector<HTMLElement>(".redesign-footer-inner");
      if (!button) throw new Error("The footer back-to-top button is missing.");
      const footerRect = element.getBoundingClientRect();
      const innerRect = inner?.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      return {
        topOffset: buttonRect.top - footerRect.top,
        rightOffset: innerRect ? innerRect.right - buttonRect.right : Number.POSITIVE_INFINITY,
      };
    });
    expect(backToTopPlacement.topOffset, `back-to-top sits at the footer top at ${width}px`).toBeGreaterThanOrEqual(8);
    expect(backToTopPlacement.topOffset, `back-to-top sits at the footer top at ${width}px`).toBeLessThan(52);
    expect(backToTopPlacement.rightOffset, `back-to-top sits at the footer right at ${width}px`).toBeLessThanOrEqual(40);

    if (width >= 768) {
      const language = page.locator(".redesign-desktop-nav .redesign-language-switch");
      const accountStyle = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>(".redesign-desktop-nav");
        if (!nav) throw new Error("The desktop navigation is missing.");
        const fixture = document.createElement("details");
        fixture.className = "redesign-account-menu";
        fixture.innerHTML = '<summary class="redesign-avatar-trigger">ENHE Admin</summary><div class="redesign-avatar-menu"><a>Account</a></div>';
        nav.append(fixture);
        const trigger = fixture.querySelector<HTMLElement>(".redesign-avatar-trigger");
        const menu = fixture.querySelector<HTMLElement>(".redesign-avatar-menu");
        const menuLink = menu?.querySelector<HTMLElement>("a");
        if (!trigger || !menu || !menuLink) throw new Error("The account menu fixture failed to mount.");
        const triggerStyle = getComputedStyle(trigger);
        const menuStyle = getComputedStyle(menu);
        const linkStyle = getComputedStyle(menuLink);
        return {
          accountBorder: triggerStyle.borderColor,
          accountRadius: triggerStyle.borderRadius,
          languageBorder: getComputedStyle(document.querySelector(".redesign-language-switch")!).borderColor,
          languageRadius: getComputedStyle(document.querySelector(".redesign-language-switch")!).borderRadius,
          menuText: menuStyle.color,
          menuLinkText: linkStyle.color,
        };
      });
      expect(accountStyle.accountBorder).toBe(accountStyle.languageBorder);
      expect(accountStyle.accountRadius).toBe(accountStyle.languageRadius);
      expect(accountStyle.menuText).toBe("rgb(16, 24, 40)");
      expect(accountStyle.menuLinkText).toBe("rgb(16, 24, 40)");

      const navLetterSpacing = await page.locator(".redesign-desktop-nav").evaluate((nav) =>
        Number.parseFloat(getComputedStyle(nav).letterSpacing),
      );
      expect(navLetterSpacing).toBeGreaterThan(0);
      const navGap = await page.locator(".redesign-desktop-nav").evaluate((nav) =>
        Number.parseFloat(getComputedStyle(nav).columnGap),
      );
      expect(navGap).toBeGreaterThanOrEqual(width <= 980 ? 12 : 16);

      const cta = page.locator(".redesign-home-hero .redesign-home-cta");
      const transition = await cta.evaluate((element) => getComputedStyle(element).transitionDuration);
      expect(transition).toContain("0.17s");
      await cta.hover();
      expect(await cta.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await footer.getByRole("link", { name: "回到顶部" }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    if (process.env.ENHE_CAPTURE_HOME_UI === "1") {
      await page.screenshot({ path: `test-results/homepage-ui-polish-${width}.png`, fullPage: true });
    }
  }

  expect(rejectedOrigins).toEqual([]);
  expect(pageErrors).toEqual([]);
});
