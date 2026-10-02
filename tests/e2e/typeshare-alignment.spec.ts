import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

async function installSameOriginRequestGuard(page: Page) {
  const rejectedOrigins: string[] = [];
  const localOrigin = `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === localOrigin) {
      await route.continue();
      return;
    }

    rejectedOrigins.push(requestUrl.origin);
    await route.abort();
  });

  return rejectedOrigins;
}

const routes = [
  "/about",
  "/en/about",
  "/ai-news",
  "/en/ai-news",
  "/ai-news/topics",
  "/en/ai-news/topics",
  "/ai-news/topics/ai-agent",
  "/en/ai-news/topics/ai-agent",
] as const;

for (const route of routes) {
  test(`${route} uses one shared masthead and the quiet reference shell at mobile and desktop widths`, async ({ page }) => {
    const rejectedOrigins = await installSameOriginRequestGuard(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    const primaryNewsLinkHref = route.startsWith("/en/") ? "/en/ai-news" : "/ai-news";
    for (const width of [320, 390, 480, 768, 900, 1024, 1100, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route, { waitUntil: "load" });
      expect(response?.status(), `${route} @ ${width}`).toBe(200);
      await expect(page.locator("main").first()).toBeVisible();
      const designTokens = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        const productionShell = document.querySelector<HTMLElement>(".enhe-redesign-production");
        const referenceSurface = document.querySelector<HTMLElement>(".enhe-reference-editorial, .enhe-reference-workspace");
        const title = document.querySelector<HTMLElement>("main h1");
        if (!productionShell || !referenceSurface || !title) throw new Error("The public design shell and page title must be present.");
        const titleStyles = getComputedStyle(title);
        return {
          page: styles.getPropertyValue("--enhe-page-bg").trim().toLowerCase(),
          text: styles.getPropertyValue("--enhe-text").trim().toLowerCase(),
          muted: styles.getPropertyValue("--enhe-text-muted").trim().toLowerCase(),
          action: styles.getPropertyValue("--enhe-action").trim().toLowerCase(),
          actionHover: styles.getPropertyValue("--enhe-action-hover").trim().toLowerCase(),
          surface: styles.getPropertyValue("--enhe-surface").trim().toLowerCase(),
          elevated: styles.getPropertyValue("--enhe-surface-elevated").trim().toLowerCase(),
          border: styles.getPropertyValue("--enhe-border").trim().toLowerCase(),
          focus: styles.getPropertyValue("--enhe-focus").trim().toLowerCase(),
          yellow: styles.getPropertyValue("--enhe-yellow").trim().toLowerCase(),
          footer: styles.getPropertyValue("--enhe-footer").trim().toLowerCase(),
          referenceAccent: getComputedStyle(referenceSurface).getPropertyValue("--reference-accent").trim().toLowerCase(),
          referenceCanvas: getComputedStyle(referenceSurface).getPropertyValue("--reference-canvas").trim().toLowerCase(),
          bodyFont: getComputedStyle(productionShell).fontFamily,
          titleFont: titleStyles.fontFamily,
          titleColor: titleStyles.color,
          titleTrackingRatio: Number((Number.parseFloat(titleStyles.letterSpacing) / Number.parseFloat(titleStyles.fontSize)).toFixed(3)),
        };
      });
      expect(designTokens).toMatchObject({
        page: "#f8faf7",
        text: "#101612",
        muted: "#536057",
        action: "#2f6f44",
        actionHover: "#245a36",
        surface: "#fff",
        elevated: "#f0f5ef",
        border: "#d3ddd5",
        focus: "#f6c945",
        yellow: "#f6c945",
        footer: "#0b2119",
        referenceAccent: "#2f6f44",
        referenceCanvas: "#f8faf7",
        titleColor: "rgb(16, 22, 18)",
        titleTrackingRatio: -0.025,
      });
      expect(designTokens.bodyFont).toContain("Source Sans 3");
      expect(designTokens.titleFont).toContain("Source Serif 4");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const masthead = page.locator("header.redesign-header");
      await expect(masthead).toHaveCount(1);
      const visibleLanguageSwitchCount = await masthead.locator(".redesign-language-switch").evaluateAll(
        (switches) => switches.filter((control) => (control as HTMLElement).getClientRects().length > 0).length,
      );
      expect(visibleLanguageSwitchCount, `${route} has one visible language switch at ${width}px`).toBe(1);
      if (width < 768) {
        const menuTrigger = masthead.locator(".redesign-menu-trigger");
        await expect(menuTrigger, `${route} has a mobile menu trigger at ${width}px`).toBeVisible();
        await expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
        await menuTrigger.click();
        await expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
        const mobileDrawer = page.locator(".redesign-mobile-drawer");
        await expect(mobileDrawer).toBeVisible();
        await expect(mobileDrawer.locator(".redesign-mobile-account a"), `${route} exposes one account link in the mobile drawer`).toHaveCount(1);
        await expect(mobileDrawer.locator(".redesign-language-switch"), `${route} keeps the language switch outside the mobile drawer`).toHaveCount(0);
        const mobilePrimaryNewsLink = mobileDrawer.locator(`a[href="${primaryNewsLinkHref}"]`);
        if (route.endsWith("/ai-news")) {
          await expect(mobilePrimaryNewsLink).toHaveAttribute("aria-current", "page");
        } else {
          await expect(mobilePrimaryNewsLink).not.toHaveAttribute("aria-current");
        }
        await mobileDrawer.locator(".redesign-drawer-close").click();
        await expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(mobileDrawer).toBeHidden();
      } else {
        const visibleDesktopAccountEntryCount = await masthead.locator(".redesign-login-link, .redesign-account-menu").evaluateAll(
          (controls) => controls.filter((control) => (control as HTMLElement).getClientRects().length > 0).length,
        );
        expect(visibleDesktopAccountEntryCount, `${route} has one visible desktop account entry at ${width}px`).toBe(1);
        await expect(masthead.locator(".redesign-menu-trigger")).toBeHidden();
        const desktopPrimaryNewsLink = masthead.locator(`.redesign-desktop-nav a.redesign-nav-link[href="${primaryNewsLinkHref}"]`);
        if (route.endsWith("/ai-news")) {
          await expect(desktopPrimaryNewsLink).toHaveAttribute("aria-current", "page");
        } else {
          await expect(desktopPrimaryNewsLink).not.toHaveAttribute("aria-current");
        }
      }
      if (!route.includes("about")) {
        await expect(page.locator(".ai-news-section-shell .redesign-language-switch, .ai-news-section-shell .redesign-login-link, .ai-news-section-shell .redesign-account-menu")).toHaveCount(0);
        const localNavigation = page.locator(".ai-news-section-nav");
        await expect(localNavigation).toBeVisible();
        await expect(localNavigation.locator("a")).toHaveCount(2);
        await expect(page.locator(".ai-news-section-shell > .ai-news-section-nav")).toHaveCount(1);
        await expect(page.locator(".ai-news-section-shell .redesign-header, .ai-news-section-shell [role='banner']")).toHaveCount(0);
        await expect(localNavigation).toHaveAttribute("aria-label", route.startsWith("/en/") ? "AI News" : "AI资讯");
        const latestSectionLink = localNavigation.locator('a[href="' + primaryNewsLinkHref + '"]');
        await expect(latestSectionLink).toHaveCount(1);
        if (route.endsWith("/ai-news")) {
          await expect(latestSectionLink).toHaveAttribute("aria-current", "page");
        } else {
          await expect(latestSectionLink).not.toHaveAttribute("aria-current");
        }
        const horizontalGutter = width <= 767 ? 40 : width <= 1023 ? 64 : 96;
        const expectedNavigationWidth = Math.min(width - horizontalGutter, 1024);
        expect(Math.round(await localNavigation.evaluate((nav) => nav.getBoundingClientRect().width)), `${route} section gutter at ${width}px`)
          .toBe(expectedNavigationWidth);
        expect(await localNavigation.locator("a").evaluateAll((links) =>
          links.every((link) => (link as HTMLElement).getBoundingClientRect().height >= 44),
        ), `${route} section links meet the touch target`).toBe(true);
      }
    }

    if (route.includes("about")) {
      await expect(page.locator("main.enhe-reference-editorial")).toHaveCount(1);
    } else {
      await expect(page.locator("main.ai-news-workspace")).toHaveCount(1);
      await expect(page.locator("main.enhe-contentless-page .enhe-contentless-hero h1")).toHaveCount(1);
      await expect(page.locator(".ai-news-workspace-container")).toHaveCount(1);
      const primaryNewsLink = page.locator(`header.redesign-header .redesign-desktop-nav a.redesign-nav-link[href="${primaryNewsLinkHref}"]`);
      if (route.endsWith("/ai-news")) {
        await expect(primaryNewsLink).toHaveAttribute("aria-current", "page");
      } else {
        await expect(primaryNewsLink).not.toHaveAttribute("aria-current");
      }
      if (route.includes("/topics/")) {
        await expect(page.locator('.ai-news-section-nav a[aria-current="location"]')).toContainText(
          route.startsWith("/en/") ? "Topics" : "专题集合",
        );
      }
    }

    expect(errors, route).toEqual([]);
    expect(rejectedOrigins, `${route} must not request non-local resources`).toEqual([]);
  });
}

for (const locale of ["zh", "en"] as const) {
  for (const topicRoute of ["/ai-news/topics", "/ai-news/topics/ai-agent"] as const) {
    for (const width of [320, 390, 768, 1440]) {
      test(`AI News local navigation is keyboard reachable (${locale}, ${topicRoute}, ${width}px)`, async ({ page }) => {
        const rejectedOrigins = await installSameOriginRequestGuard(page);
        const prefix = locale === "en" ? "/en" : "";
        const target = `${prefix}${topicRoute}`;
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(target, { waitUntil: "load" });
        expect(response?.status()).toBe(200);

        const localNavigation = page.locator(".ai-news-section-nav");
        const latestLink = localNavigation.locator(`a[href="${prefix}/ai-news"]`);
        const topicsLink = localNavigation.locator(`a[href="${prefix}/ai-news/topics"]`);
        await expect(localNavigation).toBeVisible();
        await expect(latestLink).not.toHaveAttribute("aria-current");
        let latestLinkReached = false;
        for (let tab = 0; tab < 24; tab += 1) {
          await page.keyboard.press("Tab");
          if (await latestLink.evaluate((element) => document.activeElement === element)) {
            latestLinkReached = true;
            break;
          }
        }

        expect(latestLinkReached, `${locale} ${topicRoute} ${width}px can tab to the Latest section link`).toBe(true);
        await expect(latestLink).toBeFocused();
        expect(await latestLink.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
        expect(await latestLink.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe("3px");
        await page.keyboard.press("Tab");
        await expect(topicsLink).toBeFocused();
        expect(await topicsLink.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
        expect(await topicsLink.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe("3px");
        await expect(topicsLink).toHaveAttribute(
          "aria-current",
          topicRoute.endsWith("/topics") ? "page" : "location",
        );
        await expect(localNavigation.locator("[aria-current]")).toHaveCount(1);
        expect(rejectedOrigins, `${target} must not request non-local resources`).toEqual([]);
      });
    }
  }
}
