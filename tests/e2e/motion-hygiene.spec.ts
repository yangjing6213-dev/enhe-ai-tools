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
