import { expect, test } from "@playwright/test";

const routes = ["/ai-news", "/en/ai-news"] as const;
const viewports = [
  { width: 320, height: 844 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

for (const route of routes) {
  test(`${route} keeps the DB-free listing inside the light editorial boundary`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const wasCanceledNextPrefetch =
        new URL(request.url()).searchParams.has("_rsc") &&
        request.failure()?.errorText?.startsWith("net::ERR_ABORTED");
      const wasCanceledAnalyticsOnNavigation =
        new URL(request.url()).pathname === "/api/analytics" &&
        request.failure()?.errorText === "net::ERR_ABORTED";
      const wasCanceledEmojiRequestOnNavigation =
        new URL(request.url()).pathname === "/api/emojis" &&
        request.failure()?.errorText === "net::ERR_ABORTED";
      if (
        !wasCanceledNextPrefetch &&
        !wasCanceledAnalyticsOnNavigation &&
        !wasCanceledEmojiRequestOnNavigation
      ) {
        failedRequests.push(
          `${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
        );
      }
    });

    await page.setViewportSize(viewports[0]);
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("load");

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(page.locator("main.ai-news-page")).toBeVisible();
      await expect(page.locator('[data-content-status="UNVERIFIED"]')).toBeVisible();

      const styles = await page.locator("main.ai-news-page").evaluate((main) => {
        const root = getComputedStyle(main);
        const panel = main.querySelector<HTMLElement>('[data-content-status="UNVERIFIED"]');
        const panelStyles = panel ? getComputedStyle(panel) : null;

        return {
          backgroundColor: root.backgroundColor,
          color: root.color,
          panelBackgroundColor: panelStyles?.backgroundColor,
          panelBackdropFilter: panelStyles?.backdropFilter,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(styles.backgroundColor).toBe("rgb(255, 255, 255)");
      expect(styles.color).toBe("rgb(0, 0, 0)");
      expect(styles.panelBackgroundColor).toBe("rgb(255, 255, 255)");
      expect(styles.panelBackdropFilter).toBe("none");
      expect(styles.scrollWidth).toBeLessThanOrEqual(viewport.width);

      if (viewport.width <= 390) {
        const longClaim = {
          title: `LONG_UNSPACED_AI_CLAIM_${"X".repeat(180)}`,
          summary: `LONG_UNSPACED_AI_SUMMARY_${"Y".repeat(520)}`,
        };
        await page.locator("main.ai-news-page").evaluate(
          (main, claim) => {
            const card =
              main.querySelector<HTMLElement>('[data-long-claim-fixture="true"]') ??
              document.createElement("article");
            card.dataset.longClaimFixture = "true";
            card.className =
              "glass mt-8 w-full max-w-full overflow-hidden rounded-2xl p-5";

            const title = document.createElement("h2");
            title.dataset.longClaimTitle = "true";
            title.className =
              "mt-4 break-words text-xl font-black leading-snug";
            title.textContent = claim.title;

            const summary = document.createElement("p");
            summary.dataset.longClaimSummary = "true";
            summary.className = "mt-3 break-words text-sm leading-7";
            summary.textContent = claim.summary;

            card.replaceChildren(title, summary);
            main.append(card);
          },
          longClaim,
        );

        const fixture = page.locator('[data-long-claim-fixture="true"]');
        await expect(fixture).toBeVisible();

        const claimMetrics = await fixture.evaluate((card) => {
          const title = card.querySelector<HTMLElement>("[data-long-claim-title]");
          const summary = card.querySelector<HTMLElement>("[data-long-claim-summary]");
          const titleStyles = title ? getComputedStyle(title) : null;
          const summaryStyles = summary ? getComputedStyle(summary) : null;
          const lineHeight = (styles: CSSStyleDeclaration | null) =>
            styles ? Number.parseFloat(styles.lineHeight) : Number.NaN;

          return {
            cardClientWidth: card.clientWidth,
            cardScrollWidth: card.scrollWidth,
            cardLeft: card.getBoundingClientRect().left,
            cardRight: card.getBoundingClientRect().right,
            documentScrollWidth: document.documentElement.scrollWidth,
            titleText: title?.textContent ?? "",
            summaryText: summary?.textContent ?? "",
            titleClientHeight: title?.clientHeight ?? 0,
            titleScrollHeight: title?.scrollHeight ?? 0,
            titleLineHeight: lineHeight(titleStyles),
            titleOverflow: titleStyles?.overflow ?? "",
            titleTextOverflow: titleStyles?.textOverflow ?? "",
            titleMaxHeight: titleStyles?.maxHeight ?? "",
            titleClipPath: titleStyles?.clipPath ?? "",
            summaryClientHeight: summary?.clientHeight ?? 0,
            summaryScrollHeight: summary?.scrollHeight ?? 0,
            summaryLineHeight: lineHeight(summaryStyles),
            summaryOverflowWrap: summaryStyles?.overflowWrap ?? "",
            summaryOverflow: summaryStyles?.overflow ?? "",
            summaryTextOverflow: summaryStyles?.textOverflow ?? "",
            summaryMaxHeight: summaryStyles?.maxHeight ?? "",
            summaryClipPath: summaryStyles?.clipPath ?? "",
          };
        });

        expect(claimMetrics.cardScrollWidth).toBeLessThanOrEqual(
          claimMetrics.cardClientWidth,
        );
        expect(claimMetrics.cardLeft).toBeGreaterThanOrEqual(0);
        expect(claimMetrics.cardRight).toBeLessThanOrEqual(viewport.width);
        expect(claimMetrics.documentScrollWidth).toBeLessThanOrEqual(
          viewport.width,
        );
        expect(claimMetrics.titleText).toBe(longClaim.title);
        expect(claimMetrics.summaryText).toBe(longClaim.summary);
        expect(claimMetrics.titleScrollHeight).toBeGreaterThan(
          claimMetrics.titleLineHeight,
        );
        expect(claimMetrics.summaryScrollHeight).toBeGreaterThan(
          claimMetrics.summaryLineHeight,
        );
        expect(claimMetrics.titleClientHeight).toBe(
          claimMetrics.titleScrollHeight,
        );
        expect(claimMetrics.titleOverflow).toBe("visible");
        expect(claimMetrics.titleTextOverflow).toBe("clip");
        expect(claimMetrics.titleMaxHeight).toBe("none");
        expect(claimMetrics.titleClipPath).toBe("none");
        expect(claimMetrics.summaryClientHeight).toBe(
          claimMetrics.summaryScrollHeight,
        );
        expect(claimMetrics.summaryOverflowWrap).toBe("break-word");
        expect(claimMetrics.summaryOverflow).toBe("visible");
        expect(claimMetrics.summaryTextOverflow).toBe("clip");
        expect(claimMetrics.summaryMaxHeight).toBe("none");
        expect(claimMetrics.summaryClipPath).toBe("none");
      }
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

test("AI News cover matches content while About keeps the forum cover frame", async ({ page }) => {
  for (const width of [320, 390, 700, 701, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const expectedWidth = width <= 700 ? width - 32 : Math.min(width - 40, 1120);

    for (const route of ["/ai-news", "/about"] as const) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const cover = page.locator(".enhe-page-cover");
      const image = cover.locator("img");
      await expect(cover).toBeVisible();
      await expect(image).toBeVisible();

      const frame = await cover.boundingBox();
      expect(frame).not.toBeNull();
      if (route === "/ai-news") {
        const content = await page.locator(".ai-news-page .glass").first().boundingBox();
        expect(content).not.toBeNull();
        expect(frame!.x).toBeCloseTo(content!.x, 1);
        expect(frame!.width).toBeCloseTo(content!.width, 1);
      } else {
        expect(frame!.width).toBeCloseTo(expectedWidth, 0);
      }
      expect(frame!.width / frame!.height).toBeCloseTo(1448 / 620, 2);
      expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});
