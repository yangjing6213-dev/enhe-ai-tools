import { expect, test } from "@playwright/test";

const knownRoutes = [
  "/ai-news/topics/ai-agent",
  "/en/ai-news/topics/ai-agent",
] as const;

const unknownRoutes = [
  "/ai-news/topics/not-a-real-topic",
  "/en/ai-news/topics/not-a-real-topic",
] as const;

for (const route of knownRoutes) {
  test(`${route} keeps the DB-free topic shell inside the light editorial boundary`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });

      expect(response?.status()).toBe(200);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        route.startsWith("/en/")
          ? "UNVERIFIED - AI News topic content is not available in this local preview."
          : "待核验：本地预览不提供 AI 资讯专题内容。",
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/i,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /follow/i,
      );
      const structuredTypes = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((elements) => {
          const collectTypes = (value: unknown): string[] => {
            if (Array.isArray(value)) return value.flatMap(collectTypes);
            if (!value || typeof value !== "object") return [];

            const record = value as {
              ["@type"]?: unknown;
              ["@graph"]?: unknown;
            };
            const type = record["@type"];
            const ownTypes = Array.isArray(type)
              ? type.filter(
                  (entry): entry is string => typeof entry === "string",
                )
              : typeof type === "string"
                ? [type]
                : [];

            return [...ownTypes, ...collectTypes(record["@graph"] ?? [])];
          };

          return elements.flatMap((element) =>
            collectTypes(JSON.parse(element.textContent ?? "")),
          );
        });
      expect(structuredTypes).not.toEqual(
        expect.arrayContaining([
          "CollectionPage",
          "ItemList",
          "FAQPage",
          "NewsArticle",
        ]),
      );
      const main = page.locator(
        'main.ai-news-page.ai-news-topic-page[data-content-status="UNVERIFIED"]',
      );
      await expect(main).toBeVisible();
      await expect(main.getByRole("status")).toBeVisible();
      await expect(
        main.getByText(
          route.startsWith("/en/")
            ? "AI News Topic Preview"
            : "AI资讯专题预览",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        main.getByText(
          route.startsWith("/en/")
            ? "UNVERIFIED - Topic content is not available in this local preview yet."
            : "待核验：本地预览暂不提供专题内容。",
          { exact: true },
        ),
      ).toBeVisible();
      const returnLink = main.locator(
        `a[href="${route.startsWith("/en/") ? "/en/ai-news" : "/ai-news"}"]`,
      );
      await expect(returnLink).toBeVisible();
      await returnLink.focus();
      const focusStyles = await returnLink.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          active: document.activeElement === element,
          outlineWidth: styles.outlineWidth,
          outlineStyle: styles.outlineStyle,
          outlineOffset: styles.outlineOffset,
          boxShadow: styles.boxShadow,
          position: styles.position,
          zIndex: styles.zIndex,
        };
      });
      expect(focusStyles.active).toBe(true);
      expect(focusStyles.outlineWidth).toBe("3px");
      expect(focusStyles.outlineStyle).toBe("solid");
      expect(focusStyles.outlineOffset).toBe("3px");
      expect(focusStyles.boxShadow).not.toBe("none");
      expect(focusStyles.position).toBe("relative");
      expect(focusStyles.zIndex).not.toBe("auto");
      const statePanel = main.locator(".enhe-contentless-state");
      await expect(statePanel).toBeVisible();

      const styles = await main.evaluate((element) => {
        const panel = element.querySelector(".enhe-contentless-state");
        const panelStyles = panel ? getComputedStyle(panel) : null;
        const rect = element.getBoundingClientRect();
        return {
          backgroundColor: getComputedStyle(element).backgroundColor,
          panelBackgroundColor: panelStyles?.backgroundColor,
          panelBackdropFilter: panelStyles?.backdropFilter,
          panelBoxShadow: panelStyles?.boxShadow,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          mainRight: rect.right,
        };
      });

      expect(styles.backgroundColor).toBe("rgb(255, 255, 255)");
      expect(styles.panelBackgroundColor).toBe("rgb(255, 255, 255)");
      expect(styles.panelBackdropFilter).toBe("none");
      expect(styles.panelBoxShadow).toBe("none");
      expect(styles.scrollWidth).toBeLessThanOrEqual(styles.viewportWidth);
      expect(styles.mainRight).toBeLessThanOrEqual(styles.viewportWidth);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

for (const route of unknownRoutes) {
  test(`${route} remains a 404 for unknown topics`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });

    expect(response?.status()).toBe(404);
  });
}
