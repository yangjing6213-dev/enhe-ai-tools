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
      if (!wasCanceledNextPrefetch) {
        failedRequests.push(
          `${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
        );
      }
    });

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });

      expect(response?.status()).toBe(200);
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
      expect(styles.color).toBe("rgb(16, 24, 40)");
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
            const card = document.createElement("article");
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

            card.append(title, summary);
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
