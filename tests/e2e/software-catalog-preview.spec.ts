import { expect, test, type Locator, type Page } from "@playwright/test";

const locales = [
  { query: "zh", triggerLabel: "全部商品" },
  { query: "en", triggerLabel: "All products" },
] as const;

async function openSoftwarePreview(page: Page, locale: "zh" | "en") {
  await page.context().addCookies([
    {
      name: "enhe_locale",
      value: locale,
      url: `http://127.0.0.1:${process.env.PORT ?? "3000"}/`,
    },
  ]);

  return page.goto("/redesign-preview/software", { waitUntil: "load" });
}

async function expectDarkFocusGuard(
  locator: Locator,
  label: string,
) {
  await locator.focus();
  const boxShadow = await locator.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(boxShadow, `${label} focus guard`).not.toBe("none");
}

async function expectForcedColorFocusRing(locator: Locator, label: string) {
  await locator.focus();
  const focusStyles = await locator.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      outlineStyle: styles.outlineStyle,
      outlineWidth: styles.outlineWidth,
    };
  });

  expect(focusStyles.outlineStyle, `${label} forced-colors outline`).not.toBe("none");
  expect(
    Number.parseFloat(focusStyles.outlineWidth),
    `${label} forced-colors outline width`,
  ).toBeGreaterThanOrEqual(3);
}

for (const locale of locales) {
  test(`DB-free ${locale.query} software preview keeps catalogue actions at 48px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => requestFailures.push(request.url()));

    const response = await openSoftwarePreview(page, locale.query);

    expect(response?.status(), `${locale.query} preview status`).toBe(200);
    const trigger = page.locator(".redesign-software-category-trigger");
    await expect(trigger).toHaveAttribute("aria-controls", /.+/);
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox?.height, `${locale.query} category trigger height`).toBeGreaterThanOrEqual(48);
    await expect(trigger).toContainText(locale.triggerLabel);
    const cardAction = page.locator(".redesign-software-card-link").first();
    const cardActionBox = await cardAction.boundingBox();
    expect(cardActionBox?.height, `${locale.query} card action height`).toBeGreaterThanOrEqual(48);
    await expectDarkFocusGuard(trigger, `${locale.query} category trigger`);
    await expectDarkFocusGuard(page.locator(".redesign-software-card-full-link").first(), `${locale.query} card link`);
    await trigger.focus();
    await trigger.press("Enter");
    const panel = page.locator(".redesign-software-category-panel");
    await expect(panel).toBeVisible();
    await expectDarkFocusGuard(
      panel.locator(".redesign-software-category-button").first(),
      `${locale.query} category option`,
    );
    await expect(panel.locator('[data-category-close="true"]')).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("lang", locale.query === "en" ? "en" : "zh");
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
  });
}

for (const locale of locales) {
  test(`DB-free ${locale.query} software preview keeps focus visible in forced colors`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => requestFailures.push(request.url()));

    await page.emulateMedia({ forcedColors: "active" });
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await openSoftwarePreview(page, locale.query);

    expect(response?.status(), `${locale.query} forced-colors preview status`).toBe(200);
    const trigger = page.locator(".redesign-software-category-trigger");
    const cardLink = page.locator(".redesign-software-card-full-link").first();
    await expectForcedColorFocusRing(cardLink, `${locale.query} card link`);
    await expectForcedColorFocusRing(trigger, `${locale.query} category trigger`);
    await trigger.press("Enter");

    const panel = page.locator(".redesign-software-category-panel");
    await expect(panel).toBeVisible();
    await expectForcedColorFocusRing(
      panel.locator(".redesign-software-category-button").first(),
      `${locale.query} category option`,
    );
    await expect(panel.locator('[data-category-close="true"]')).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expectForcedColorFocusRing(trigger, `${locale.query} category dismissal`);
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
  });
}

for (const locale of locales) {
  test(`DB-free ${locale.query} software preview wraps long card titles at 320px`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => requestFailures.push(request.url()));

    await page.setViewportSize({ width: 320, height: 844 });
    const response = await openSoftwarePreview(page, locale.query);

    expect(response?.status(), `${locale.query} title-wrap preview status`).toBe(200);
    const longTitle = `LONG_UNSPACED_SOFTWARE_TITLE_${"Z".repeat(220)}`;
    const title = page.locator(".redesign-software-card-body h3").first();
    await expect(title).toBeVisible();
    await title.evaluate((element, value) => {
      element.textContent = value;
    }, longTitle);

    const metrics = await title.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const card = element.closest(".redesign-software-card")?.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return {
        text: element.textContent,
        right: rect.right,
        cardRight: card?.right ?? 0,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        lineHeight: styles.lineHeight,
      };
    });
    const documentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(metrics.text).toBe(longTitle);
    expect(metrics.scrollWidth, `${locale.query} title scroll width`).toBeLessThanOrEqual(
      metrics.clientWidth,
    );
    expect(metrics.right, `${locale.query} title/card containment`).toBeLessThanOrEqual(
      metrics.cardRight + 1,
    );
    expect(metrics.lineHeight).not.toBe("normal");
    expect(documentOverflow, `${locale.query} document horizontal overflow`).toBe(0);
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
  });
}

for (const locale of locales) {
  test(`DB-free ${locale.query} software category sheet stays inside 320px viewport`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => requestFailures.push(request.url()));

    await page.setViewportSize({ width: 320, height: 844 });
    const response = await openSoftwarePreview(page, locale.query);

    expect(response?.status(), `${locale.query} category-sheet preview status`).toBe(200);
    const trigger = page.locator(".redesign-software-category-trigger");
    await trigger.focus();
    await trigger.press("Enter");

    const panel = page.locator(".redesign-software-category-panel");
    await expect(panel).toBeVisible();
    await expect
      .poll(
        async () =>
          panel.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return rect.top >= -0.5 && rect.bottom <= window.innerHeight + 0.5;
          }),
        { message: `${locale.query} category-sheet settled viewport boundary` },
      )
      .toBe(true);
    const metrics = await panel.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        boxSizing: styles.boxSizing,
        maxWidth: styles.maxWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(metrics.boxSizing, `${locale.query} category-sheet box sizing`).toBe("border-box");
    expect(metrics.maxWidth, `${locale.query} category-sheet max width`).not.toBe("none");
    expect(metrics.left, `${locale.query} category-sheet left boundary`).toBeGreaterThanOrEqual(0);
    expect(metrics.top, `${locale.query} category-sheet top boundary`).toBeGreaterThanOrEqual(0);
    expect(metrics.right, `${locale.query} category-sheet right boundary`).toBeLessThanOrEqual(
      metrics.viewportWidth,
    );
    expect(metrics.bottom, `${locale.query} category-sheet bottom boundary`).toBeLessThanOrEqual(
      metrics.viewportHeight,
    );
    expect(metrics.width, `${locale.query} category-sheet width`).toBeLessThanOrEqual(
      metrics.viewportWidth,
    );
    expect(metrics.scrollWidth, `${locale.query} category-sheet content width`).toBeLessThanOrEqual(
      metrics.clientWidth,
    );
    expect(metrics.documentOverflow, `${locale.query} category-sheet document overflow`).toBe(0);
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
  });
}

for (const locale of locales) {
  test(`DB-free ${locale.query} software preview stays readable at 200% text zoom`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => requestFailures.push(request.url()));

    await page.setViewportSize({ width: 390, height: 844 });
    const response = await openSoftwarePreview(page, locale.query);

    expect(response?.status(), `${locale.query} 200% zoom preview status`).toBe(200);
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });

    const metrics = await page.locator("main[data-software-catalog-root]").evaluate((main) => {
      const viewportWidth = document.documentElement.clientWidth;
      const mainRect = main.getBoundingClientRect();
      const heading = main.querySelector("h1")?.getBoundingClientRect();
      const trigger = main
        .querySelector<HTMLElement>(".redesign-software-category-trigger")
        ?.getBoundingClientRect();
      const action = main
        .querySelector<HTMLElement>(".redesign-software-card-link")
        ?.getBoundingClientRect();

      return {
        viewportWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        mainLeft: mainRect.left,
        mainRight: mainRect.right,
        headingHeight: heading?.height ?? 0,
        triggerRight: trigger?.right ?? 0,
        actionRight: action?.right ?? 0,
        actionHeight: action?.height ?? 0,
      };
    });

    expect(metrics.documentScrollWidth, `${locale.query} 200% document overflow`).toBeLessThanOrEqual(
      metrics.viewportWidth,
    );
    expect(metrics.mainLeft, `${locale.query} 200% main left boundary`).toBeGreaterThanOrEqual(0);
    expect(metrics.mainRight, `${locale.query} 200% main right boundary`).toBeLessThanOrEqual(
      metrics.viewportWidth,
    );
    expect(metrics.headingHeight, `${locale.query} 200% heading visibility`).toBeGreaterThan(0);
    expect(metrics.triggerRight, `${locale.query} 200% category control boundary`).toBeLessThanOrEqual(
      metrics.viewportWidth,
    );
    expect(metrics.actionRight, `${locale.query} 200% card action boundary`).toBeLessThanOrEqual(
      metrics.viewportWidth,
    );
    expect(metrics.actionHeight, `${locale.query} 200% card action visibility`).toBeGreaterThan(0);
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
  });
}

for (const locale of locales) {
  test(`DB-free ${locale.query} software cards match the Skill layout without cover gaps or clipped actions`, async ({ page }) => {
    test.setTimeout(90_000);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await openSoftwarePreview(page, locale.query);
      const cards = page.locator(".redesign-software-card:visible");
      const layout = await cards.evaluateAll((elements) => elements.map((card) => {
        const bounds = card.getBoundingClientRect();
        const style = getComputedStyle(card);
        const frame = card.querySelector(".redesign-software-card-frame")!.getBoundingClientRect();
        const action = card.querySelector(".redesign-software-card-link")!.getBoundingClientRect();
        const body = card.querySelector(".redesign-software-card-body")!;
        return {
          section: card.getAttribute("data-section"),
          trackOffsets: [
            ".redesign-software-card-badges",
            ".redesign-software-card-identity",
            ".redesign-software-card-description",
            ".redesign-software-card-highlights",
            ".redesign-software-card-audience",
            ".redesign-software-card-bottom",
          ].map((selector) => {
            const element = card.querySelector<HTMLElement>(selector);
            return element ? element.getBoundingClientRect().top - bounds.top : null;
          }),
          topGap: frame.top - bounds.top - parseFloat(style.borderTopWidth),
          radius: style.borderRadius,
          height: bounds.height,
          actionFits: action.bottom <= bounds.bottom && action.right <= bounds.right && action.left >= bounds.left,
          bodyFits: body.scrollHeight <= body.clientHeight + 1,
        };
      }));
      expect(layout.length).toBeGreaterThan(0);
      for (const card of layout) {
        expect(card.topGap, `${width}px cover flush`).toBeLessThanOrEqual(1);
        expect(card.radius).toBe("0px");
        expect(card.height).toBeLessThan(751);
        expect(card.height).toBeGreaterThan(300);
        expect(card.actionFits, `${width}px action: ${JSON.stringify(card)}`).toBe(true);
        expect(card.bodyFits, `${width}px content: ${JSON.stringify(card)}`).toBe(true);
      }
      for (const section of new Set(layout.map((card) => card.section))) {
        const sectionCards = layout.filter((card) => card.section === section);
        for (let track = 0; track < sectionCards[0].trackOffsets.length; track += 1) {
          const positions = sectionCards
            .map((card) => card.trackOffsets[track])
            .filter((position): position is number => position !== null);
          if (positions.length > 1) {
            expect(
              Math.max(...positions) - Math.min(...positions),
              `${width}px ${section} content row ${track} aligns with the first card`,
            ).toBeLessThanOrEqual(1);
          }
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const first = cards.first();
      await expect(first.locator(".redesign-software-card-description strong")).toHaveText(locale.query === "zh" ? "价值:" : "Value:");
      await expect(first.locator(".redesign-software-card-highlights li").first()).toBeVisible();
      await expect(cards.locator(".redesign-software-card-commerce, .redesign-software-card-price")).toHaveCount(0);
      await expect(first.locator(".redesign-software-card-link")).toHaveText("");
      await expect(first.locator(".redesign-software-card-full-link")).toHaveAccessibleName(await first.locator("h3").innerText());
      if (width === 1440 || width === 390) {
        await first.screenshot({ path: `output/ui-followup/card-${locale.query}-${width}.png` });
      }
      if (width === 1440) {
        await first.hover();
        await expect(first).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -3)");
        await page.mouse.move(0, 0);
      }
    }
  });
}

test("clicking a software card's content opens that product's detail page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openSoftwarePreview(page, "zh");
  await page.route("**/software/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<main>详情预览</main>" }),
  );

  const card = page.locator(".redesign-software-card:visible").first();
  const target = await card.locator(".redesign-software-card-full-link").getAttribute("href");
  expect(target).toBeTruthy();
  const expectedUrl = new URL(target!, page.url()).href;
  await card.locator(".redesign-software-card-identity h3").click();
  await expect(page).toHaveURL(expectedUrl);
});
