import { expect, test, type Page } from "@playwright/test";
import { getAuthSecret, signHeaderUserCookieValue } from "@/lib/auth-security";
import { headerUserCookieName } from "@/lib/header-user-cookie";

test.use({ serviceWorkers: "block" });

async function installLoopbackOnlyGuard(page: Page) {
  const rejectedOrigins: string[] = [];
  const port = process.env.PORT ?? "3000";
  const localOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);

  await page.route("**/*", async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (localOrigins.has(origin)) {
      await route.continue();
      return;
    }
    rejectedOrigins.push(origin);
    await route.abort();
  });

  return rejectedOrigins;
}

test("homepage polish stays readable, responsive, and interactive without external services", async ({ page }) => {
  test.setTimeout(90_000);

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
    await expect(brandLabel).toHaveCount(0);
    await expect(hero.locator("h1")).toHaveAttribute("aria-label", "AI一站式平台 一起创造未来");
    const heroTitleLines = hero.locator("h1 > span");
    await expect(heroTitleLines).toHaveText(["AI一站式平台", "一起创造未来"]);
    await expect(hero.locator(".redesign-home-hero-inner")).toHaveCSS("text-align", "center");
    await expect(hero).toHaveCSS("background-image", "none");
    const heroColor = await hero.evaluate((element) => getComputedStyle(element).color);
    const expectedNeutralTextColor = "rgb(0, 0, 0)";
    expect(heroColor).toBe(expectedNeutralTextColor);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    expect((await brand.boundingBox())?.width).toBe(154);

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
      await page.locator(".redesign-menu-trigger").click();
      await expect(page.locator(".redesign-mobile-drawer .theme-toggle")).toHaveCount(0);
      await page.locator(".redesign-drawer-close").click();
    }

    const featureCards = page.locator(".redesign-home-feature-card");
    await expect(featureCards).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      for (const borderProperty of ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"]) {
        await expect(featureCards.nth(index)).toHaveCSS(borderProperty, "0px");
      }
    }

    const productHeading = page.locator(".redesign-home-products-heading h2");
    await expect(productHeading).toHaveCSS("text-align", "center");
    const headingDoesNotOverflow = await productHeading.evaluate((element) =>
      element.scrollWidth <= element.clientWidth,
    );
    expect(headingDoesNotOverflow, `product heading stays within its section at ${width}px`).toBe(true);
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
    await expect(reviews.getByRole("heading", { name: "客户的心得" })).toBeVisible();
    const reviewHeadingSize = await page.evaluate(() => {
      const productHeading = document.querySelector<HTMLElement>(".redesign-home-products-eyebrow");
      const reviewHeading = document.querySelector<HTMLElement>(".redesign-home-reviews-heading-row h2");
      if (!productHeading || !reviewHeading) throw new Error("A homepage section heading is missing.");
      const typography = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return { size: style.fontSize, weight: style.fontWeight, spacing: style.letterSpacing, family: style.fontFamily, color: style.color };
      };
      return [typography(productHeading), typography(reviewHeading)];
    });
    expect(reviewHeadingSize[1], `review and product headings share one size at ${width}px`).toEqual(reviewHeadingSize[0]);
    expect(reviewHeadingSize[0].size).toBe("32px");
    await expect(reviews.locator(".redesign-home-reviews-disclosure")).toHaveText("AI 生成示例（非真实用户反馈）");
    await expect(reviews.locator(".redesign-home-reviews-control, .redesign-home-review-triangle")).toHaveCount(0);
    await expect(reviews.getByRole("button", { name: "上一条评价" })).toHaveCount(0);
    await expect(reviews.getByRole("button", { name: "下一条评价" })).toHaveCount(0);
    if (width <= 480) {
      await expect(reviews.locator('.redesign-home-review-card:not([data-position="0"])').first()).toHaveCSS("visibility", "hidden");
      const activeReviewBounds = await reviews.locator('.redesign-home-review-card[data-position="0"]').evaluate((card) => {
        const { left, right, width: cardWidth } = card.getBoundingClientRect();
        return { left, right, width: cardWidth };
      });
      expect(activeReviewBounds.left).toBeGreaterThanOrEqual(0);
      expect(activeReviewBounds.right).toBeLessThanOrEqual(width);
      expect(activeReviewBounds.width).toBeGreaterThan(width * 0.75);
    }
    const activeReviewQuote = reviews.locator('.redesign-home-review-card[data-position="0"] blockquote');
    const initialReviewQuote = await activeReviewQuote.textContent();
    await reviews.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => activeReviewQuote.textContent()).not.toBe(initialReviewQuote);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => activeReviewQuote.textContent()).toBe(initialReviewQuote);
    const reviewAvatar = reviews.locator('.redesign-home-review-card[data-position="0"] .redesign-home-review-avatar');
    await expect(reviewAvatar).toHaveAttribute("alt", /AI 生成的虚构人物/);
    const pauseRotation = reviews.getByRole("button", { name: "暂停轮播" });
    await expect(pauseRotation).toHaveAttribute("aria-pressed", "false");
    await expect(pauseRotation).toHaveText("");
    await pauseRotation.click();
    await expect(reviews.getByRole("button", { name: "继续轮播" })).toHaveAttribute("aria-pressed", "true");
    if (width === 1440) {
      await expect(reviews).toHaveAttribute("data-motion-modality", "keyboard");
      await expect(reviews.locator('.redesign-home-review-card[data-position="0"]')).toHaveCSS("transition-property", "none");
    }

    const footer = page.locator(".redesign-footer");
    await expect(footer).toHaveCSS("background-color", "rgb(13, 58, 109)");
    await expect(page.locator(".redesign-brand-mark")).toHaveAttribute("src", "/images/enhe-logo-white.png");
    await expect(footer.locator(".footer-brand-logo")).toHaveAttribute("src", /enhe-footer-wordmark/);
    const footerAlignment = await footer.evaluate((element) => {
      const heading = element.querySelector<HTMLElement>(".redesign-home-brand-value-inner h2");
      const cta = element.querySelector<HTMLElement>(".redesign-home-brand-value-cta");
      const logo = element.querySelector<HTMLElement>(".footer-brand-logo");
      const navigation = element.querySelector<HTMLElement>(".footer-navigation");
      const firstTrigger = element.querySelector<HTMLElement>(".footer-group-trigger");
      if (!heading || !cta || !logo || !navigation || !firstTrigger) {
        throw new Error("A footer alignment element is missing.");
      }
      const matrixY = (target: HTMLElement) => {
        const transform = getComputedStyle(target).transform;
        return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
      };
      return {
        headingTop: heading.getBoundingClientRect().top,
        headingSize: Number.parseFloat(getComputedStyle(heading).fontSize),
        ctaHeight: cta.getBoundingClientRect().height,
        ctaShift: matrixY(cta),
        logoHeight: logo.getBoundingClientRect().height,
        logoShift: matrixY(logo),
        logoCenterOffset: Math.abs(
          logo.getBoundingClientRect().top + logo.getBoundingClientRect().height / 2 -
          (element.querySelector<HTMLElement>(".footer-grid")!.getBoundingClientRect().top +
            element.querySelector<HTMLElement>(".footer-grid")!.getBoundingClientRect().height / 2),
        ),
        navigationTop: navigation.getBoundingClientRect().top,
        firstTriggerTop: firstTrigger.getBoundingClientRect().top,
      };
    });
    expect(footerAlignment.headingSize).toBeGreaterThanOrEqual(36);
    expect(footerAlignment.ctaShift).toBeCloseTo(footerAlignment.ctaHeight * 0.3, 0);
    if (width >= 1280) {
      expect(footerAlignment.logoCenterOffset).toBeLessThanOrEqual(1);
    }
    if (width >= 1280) {
      expect(Math.abs(footerAlignment.navigationTop - footerAlignment.headingTop)).toBeLessThanOrEqual(1);
      expect(Math.abs(footerAlignment.firstTriggerTop - footerAlignment.headingTop)).toBeLessThanOrEqual(1);
    }
    const chevronGaps = await footer.locator(".footer-group-trigger").evaluateAll((summaries) => summaries.map((summary) => {
      const title = summary.querySelector("h3")!.getBoundingClientRect();
      const icon = summary.querySelector("svg")!.getBoundingClientRect();
      return icon.left - title.right;
    }));
    expect(chevronGaps.every((gap) => gap >= 6 && gap <= 10)).toBe(true);
    const footerGroup = footer.locator("details.footer-group").first();
    await expect(footerGroup).not.toHaveAttribute("open", "");
    await footerGroup.locator("summary").click();
    await expect(footerGroup).toHaveAttribute("open", "");
    await footerGroup.locator("summary").click();
    await expect(footerGroup).not.toHaveAttribute("open", "");
    await expect(footer.getByRole("link", { name: "回到顶部" })).toHaveCount(0);
    await expect(footer.locator(".footer-back-to-top-row")).toHaveCount(0);

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
      expect(accountStyle.menuText).toBe(expectedNeutralTextColor);
      expect(accountStyle.menuLinkText).toBe(expectedNeutralTextColor);

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
      expect(transition).toContain("0.1s");
      await cta.hover();
      expect(await cta.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
      if (width === 1440) {
        await page.emulateMedia({ reducedMotion: "reduce" });
        const reducedMotionCTA = await cta.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            property: style.transitionProperty,
            duration: style.transitionDuration,
            transform: style.transform,
          };
        });
        expect(reducedMotionCTA.property).not.toContain("transform");
        expect(reducedMotionCTA.duration).toContain("0.17s");
        expect(reducedMotionCTA.transform).toBe("none");
        await page.emulateMedia({ reducedMotion: "no-preference" });
      }
    }

    if (process.env.ENHE_CAPTURE_HOME_UI === "1") {
      await page.screenshot({ path: `test-results/homepage-ui-polish-${width}.png`, fullPage: true });
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const darkPalette = await page.locator(".enhe-redesign-production").evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, foreground: style.color };
  });
  expect(darkPalette.background).toBe("rgb(255, 255, 255)");
  expect(darkPalette.foreground).toBe("rgb(0, 0, 0)");
  await expect(page.locator(".theme-toggle")).toHaveCount(0);
  if (process.env.ENHE_CAPTURE_HOME_UI === "1") {
    await page.locator(".redesign-home-products").scrollIntoViewIfNeeded();
    await expect(page.locator('.redesign-home-product-media[data-media-status="ready"]').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "test-results/homepage-ui-polish-dark-1440.png", fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const englishResponse = await page.goto("/en", { waitUntil: "load" });
  expect(englishResponse?.status(), "English homepage").toBe(200);
  const englishBrandLabel = page.locator(".redesign-header[data-home='true'] .redesign-brand-label");
  await expect(englishBrandLabel).toHaveCount(0);
  const englishReviews = page.locator(".redesign-home-reviews");
  await expect(englishReviews.getByRole("heading", { name: "Customer stories" })).toBeVisible();
  await expect(englishReviews.locator(".redesign-home-reviews-disclosure")).toHaveText("AI-generated examples (not real customer feedback).");
  await expect(englishReviews.locator(".redesign-home-reviews-control, .redesign-home-review-triangle")).toHaveCount(0);

  if (process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER !== "1") {
    const softwareResponse = await page.goto("/redesign-preview/software?locale=zh", { waitUntil: "load" });
    expect(softwareResponse?.status(), "software catalog preview").toBe(200);
    await expect(page.locator(".redesign-software-section-header h2")).toHaveText([
      "最新推荐",
      "精选推荐",
      "全部AI工具",
    ]);
    await expect(page.locator("#all-products-heading")).toHaveText("全部AI工具");
    const softwareHeadingWeights = await page.locator(".redesign-software-section-header h2, #all-products-heading").evaluateAll((headings) =>
      headings.map((heading) => Number.parseInt(getComputedStyle(heading).fontWeight, 10)),
    );
    expect(softwareHeadingWeights.length).toBeGreaterThanOrEqual(3);
    expect(softwareHeadingWeights.every((weight) => weight >= 700)).toBe(true);
  }

  expect(rejectedOrigins).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("floating inbox and cart actions stack above support and show unread status", async ({ page }) => {
  if (process.env.DATABASE_URL?.trim()) {
    throw new Error("Floating action UI checks require an unset DATABASE_URL.");
  }

  const port = process.env.PORT ?? "3000";
  const cookiePayload = Buffer.from(JSON.stringify({
    email: "visitor@example.com",
    nickname: "Test visitor",
    role: "user",
  })).toString("base64url");
  await page.context().addCookies([{
    name: headerUserCookieName,
    value: signHeaderUserCookieValue(cookiePayload, getAuthSecret()),
    url: `http://127.0.0.1:${port}/`,
  }]);
  await page.route("**/api/user/notifications/unread-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ hasUnread: true }),
    }),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });

  const cart = page.getByRole("link", { name: "查看购买订单" });
  const inbox = page.getByRole("link", { name: "站内消息，有未读消息" });
  const support = page.locator(".customer-support-widget .customer-support-launcher");
  await expect(cart).toHaveAttribute("href", "/user#orders");
  await expect(inbox).toHaveAttribute("href", "/user#notifications");
  await expect(inbox.locator(".site-floating-action-unread")).toBeVisible();
  await expect(support).toBeVisible();

  const positions = await Promise.all([cart, inbox, support].map((control) =>
    control.evaluate((element) => {
      const { top, right, bottom, width, height } = element.getBoundingClientRect();
      return { top, right, bottom, width, height, radius: getComputedStyle(element).borderRadius };
    }),
  ));
  for (const [index, position] of positions.entries()) {
    expect(position.width, `floating control ${index} width`).toBe(44);
    expect(position.height, `floating control ${index} height`).toBe(44);
    expect(position.radius, `floating control ${index} shape`).toBe("50%");
  }
  expect(positions[0].right).toBeCloseTo(positions[1].right, 0);
  expect(positions[1].right).toBeCloseTo(positions[2].right, 0);
  expect(positions[0].bottom).toBeLessThan(positions[1].top);
  expect(positions[1].bottom).toBeLessThan(positions[2].top);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cart).toHaveCSS("transition-property", "none");
  await expect(cart).toHaveCSS("transform", "none");
});
