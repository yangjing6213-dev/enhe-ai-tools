import { expect, test, type Page } from "@playwright/test";

const formalRoutes = ["/", "/en", "/software", "/en/software"] as const;

async function openFormalRoute(page: Page, route: string) {
  await page.route("**/api/analytics", (request) => request.fulfill({ status: 204 }));
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${route} response status`).toBe(200);
}

test("formal redesign routes do not inherit the legacy 450ms page entrance", async ({
  page,
  request,
}) => {
  for (const route of formalRoutes) {
    await openFormalRoute(page, route);

    const productionRoot = page.locator(".enhe-redesign-production");
    const heading = page.locator("h1").first();
    await expect(productionRoot).toBeVisible();
    await expect(heading).toBeVisible();
    await expect(productionRoot.locator(":scope > .fade-in")).toHaveCount(0);

    const motion = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".enhe-redesign-production");
      const heading = root?.querySelector<HTMLElement>("h1");
      if (!root || !heading) throw new Error("Missing production root or H1");

      const headingStyle = getComputedStyle(heading);
      const pageAnimations = root.getAnimations({ subtree: true }).map((animation) => ({
        duration: Number(animation.effect?.getComputedTiming().duration ?? 0),
        targetClass:
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof HTMLElement
            ? animation.effect.target.className
            : "",
      }));

      return {
        headingOpacity: headingStyle.opacity,
        headingTransform: headingStyle.transform,
        legacyPageAnimations: pageAnimations.filter(
          ({ duration, targetClass }) =>
            duration === 450 && /(?:^|\s)fade-in(?:\s|$)/.test(targetClass),
        ),
        rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(motion.headingOpacity, `${route} H1 opacity`).toBe("1");
    expect(motion.headingTransform, `${route} H1 transform`).toBe("none");
    expect(motion.legacyPageAnimations, `${route} legacy page animations`).toEqual([]);
    expect(motion.rootOverflow, `${route} horizontal overflow`).toBeLessThanOrEqual(0);

    const htmlResponse = await request.get(route);
    expect(htmlResponse.status(), `${route} SSR status`).toBe(200);
    const html = await htmlResponse.text();
    expect(html, `${route} SSR H1`).toMatch(/<h1\b/);
    expect(html, `${route} SSR production fade wrapper`).not.toMatch(
      /class="[^"]*\bfade-in\b[^"]*"/,
    );
  }
});

test("formal software fixed layers stay viewport-anchored", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ["/software", "/en/software"] as const) {
    await openFormalRoute(page, route);
    await page.waitForLoadState("networkidle");
    await page.locator(".redesign-software-category-trigger").click();
    const panel = page.locator(".redesign-software-category-panel");
    await expect(panel).toBeVisible();

    const geometry = await panel.evaluate((element) => {
      const transformedAncestors: string[] = [];
      let ancestor = element.parentElement;
      while (ancestor) {
        if (getComputedStyle(ancestor).transform !== "none") {
          transformedAncestors.push(ancestor.className);
        }
        ancestor = ancestor.parentElement;
      }
      return {
        position: getComputedStyle(element).position,
        transformedAncestors,
      };
    });

    expect(geometry.position, `${route} category panel positioning`).toBe("fixed");
    expect(geometry.transformedAncestors, `${route} transformed containing blocks`).toEqual([]);
  }
});

test("review focus pause stays latched until explicit continue", async ({ page }) => {
  await page.clock.install();
  await openFormalRoute(page, "/");

  const section = page.locator(".redesign-home-reviews");
  const track = page.locator(".redesign-home-reviews-track");
  const activeReview = page.locator('.redesign-home-review-card[data-active="true"]');

  await expect(activeReview).toHaveCount(1);
  await expect(track).toHaveAttribute("aria-live", "off");
  const initialReview = await activeReview.getAttribute("aria-label");

  await section.focus();
  await expect(track).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("button", { name: "继续自动播放" })).toBeVisible();

  await page.locator("header a").first().focus();
  await page.clock.fastForward(6_100);
  await expect(activeReview).toHaveAttribute("aria-label", initialReview ?? "");
  await expect(track).toHaveAttribute("aria-live", "polite");

  await section.focus();
  await page
    .getByRole("button", { name: "下一条评价" })
    .evaluate((button: HTMLButtonElement) => button.click());
  const focusedManualReview = await activeReview.getAttribute("aria-label");
  await page.clock.fastForward(12_000);
  await expect(activeReview).toHaveAttribute("aria-label", focusedManualReview ?? "");

  const continueButton = page.getByRole("button", { name: "继续自动播放" });
  await continueButton.focus();
  await continueButton.press("Enter");
  await expect(track).toHaveAttribute("aria-live", "off");
  await expect(page.getByRole("button", { name: "暂停自动播放" })).toBeVisible();

  await page.clock.fastForward(5_100);
  await expect(activeReview).not.toHaveAttribute("aria-label", initialReview ?? "");
});

test("review explicit pause and manual navigation obey timer priority", async ({ page }) => {
  await page.clock.install();
  await openFormalRoute(page, "/");

  const track = page.locator(".redesign-home-reviews-track");
  const activeReview = page.locator('.redesign-home-review-card[data-active="true"]');
  const pauseButton = page.getByRole("button", { name: "暂停自动播放" });

  await expect(activeReview).toHaveCount(1);
  const initialReview = await activeReview.getAttribute("aria-label");
  await pauseButton.evaluate((button: HTMLButtonElement) => button.click());
  await expect(track).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("button", { name: "继续自动播放" })).toBeVisible();

  await page.locator(".redesign-home-reviews").dispatchEvent("mouseleave");
  await page.locator("header a").first().focus();
  await page.clock.fastForward(12_000);
  await expect(activeReview).toHaveAttribute("aria-label", initialReview ?? "");

  await page
    .getByRole("button", { name: "继续自动播放" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(track).toHaveAttribute("aria-live", "off");

  const beforeManualMove = await activeReview.getAttribute("aria-label");
  await page
    .getByRole("button", { name: "下一条评价" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(activeReview).not.toHaveAttribute("aria-label", beforeManualMove ?? "");
  const manuallySelectedReview = await activeReview.getAttribute("aria-label");
  await expect(track).toHaveAttribute("aria-live", "polite");

  await page.clock.fastForward(5_999);
  await expect(activeReview).toHaveAttribute("aria-label", manuallySelectedReview ?? "");
  await page.clock.fastForward(1);
  await expect(track).toHaveAttribute("aria-live", "off");
  await expect(activeReview).toHaveAttribute("aria-label", manuallySelectedReview ?? "");
  await page.clock.fastForward(5_000);
  await expect(activeReview).not.toHaveAttribute("aria-label", manuallySelectedReview ?? "");
});

test("reduced motion keeps product, review, and support controls functional", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await openFormalRoute(page, "/");

  const media = page.locator(".redesign-home-product-media");
  await media.evaluate((element) => {
    element.setAttribute("data-media-status", "loading");
  });
  const productMotion = await media.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transform: style.transform,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty,
    };
  });
  expect(productMotion).toEqual({
    transform: "none",
    transitionDuration: "0.001s",
    transitionProperty: "opacity",
  });

  const track = page.locator(".redesign-home-reviews-track");
  const activeReview = page.locator('.redesign-home-review-card[data-active="true"]');
  await expect(track).toHaveAttribute("aria-live", "polite");
  const initialReview = await activeReview.getAttribute("aria-label");
  await page.clock.fastForward(12_000);
  await expect(activeReview).toHaveAttribute("aria-label", initialReview ?? "");
  await page
    .getByRole("button", { name: "下一条评价" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(activeReview).not.toHaveAttribute("aria-label", initialReview ?? "");

  const launcher = page.locator(".customer-support-launcher");
  await launcher.hover();
  const launcherMotion = await launcher.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transform: style.transform,
      transitionProperty: style.transitionProperty,
    };
  });
  expect(launcherMotion).toEqual({
    transform: "none",
    transitionProperty: "border-color",
  });

  let releaseSupportResponse = () => {};
  const supportResponseGate = new Promise<void>((resolve) => {
    releaseSupportResponse = resolve;
  });
  await page.route("**/api/support", async (route) => {
    await supportResponseGate;
    await route.fulfill({ status: 200, json: {} });
  });

  await launcher.click();
  await page.getByRole("button", { name: "没有找到答案，提交留言" }).click();
  await page.getByLabel("问题内容（必填）").fill("Reduced-motion loading check");
  await page.getByRole("button", { name: "发送留言" }).click();

  const submittingButton = page.getByRole("button", { name: "正在发送" });
  await expect(submittingButton).toBeDisabled();
  await expect(submittingButton).toContainText("正在发送");
  const spinnerAnimation = await submittingButton
    .locator(".animate-spin")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(spinnerAnimation).toBe("none");

  releaseSupportResponse();
  await expect(page.getByText("留言已发送，我们会尽快处理。")).toBeVisible();
});
