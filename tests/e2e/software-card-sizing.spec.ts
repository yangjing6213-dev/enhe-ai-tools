import { expect, test, type Page } from "@playwright/test";

test.skip(process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "1", "Uses the development-only, database-free catalog preview.");

async function cardSizes(page: Page) {
  return page.locator(".redesign-software-card:visible").evaluateAll((cards) => {
    const sizes = cards.map((card) => {
      const bounds = card.getBoundingClientRect();
      const textFits = Array.from(card.querySelectorAll<HTMLElement>("h3, .redesign-software-card-secondary"))
        .every((title) => title.scrollHeight <= title.clientHeight + 1 && title.scrollWidth <= title.clientWidth + 1);
      return { width: bounds.width, height: bounds.height, textFits };
    });
    // Compare the visible result with unconstrained content, independently of the layout implementation.
    const naturalStyle = document.createElement("style");
    naturalStyle.textContent = ".redesign-software-card { min-height: 0 !important; height: auto !important; }";
    document.head.append(naturalStyle);
    const naturalMaximum = Math.max(...cards.map((card) => card.getBoundingClientRect().height));
    naturalStyle.remove();
    return { sizes, naturalMaximum };
  });
}

async function expectUniformCards(page: Page) {
  await expect.poll(async () => {
    const { sizes, naturalMaximum } = await cardSizes(page);
    return sizes.filter((size) =>
      Math.abs(size.height - naturalMaximum) > 1 ||
      Math.abs(size.width - sizes[0].width) > 1 || !size.textFits)
      .map((size) => ({ ...size, naturalMaximum, expectedWidth: sizes[0].width }));
  }).toEqual([]);
  expect((await cardSizes(page)).sizes.length).toBeGreaterThan(1);
  return (await cardSizes(page)).naturalMaximum;
}

for (const locale of ["zh", "en"] as const) {
  test(`${locale} catalog uses the tallest natural card across sections and preserves complete covers`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/redesign-preview/software?locale=${locale}`);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 1024, 768, 390, 320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expectUniformCards(page);
      const images = page.locator(".redesign-software-card:visible img");
      await expect(images.first()).toBeVisible();
      await expect.poll(() => images.evaluateAll((elements) => elements.every((image) => {
        const frame = image.parentElement!.getBoundingClientRect();
        return (image as HTMLImageElement).naturalWidth > 0 &&
          getComputedStyle(image).objectFit === "contain" && Math.abs(frame.width / frame.height - 16 / 9) < 0.01;
      })),
      ).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (width === 390) {
        const rail = page.locator('[data-horizontal-cards="featured"]');
        expect(await rail.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
        await rail.focus();
        await page.keyboard.press("ArrowRight");
        await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      }
    }
    expect(errors).toEqual([]);
  });
}

test("catalog height grows with content and shrinks when the tallest card is filtered out", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/redesign-preview/software?locale=en");
  await page.evaluate(() => document.fonts.ready);
  const initialHeight = await expectUniformCards(page);
  const title = page.locator('[data-section="featured-products"][data-category="image"] h3');
  const longTitle = "AgentGuardian | Read-Only Audit for Windows AI Configurations and complete local configuration review ".repeat(8);
  await title.evaluate((element, text) => { element.textContent = text; }, longTitle);
  await expectUniformCards(page);
  expect((await cardSizes(page)).naturalMaximum).toBeGreaterThan(initialHeight + 100);
  await expect(title).toHaveText(longTitle.trim());
  await page.locator(".redesign-software-category-trigger").click();
  await page.getByRole("button", { name: "Video generation", exact: true }).click();
  await expect(page.locator('[data-section="featured-products"][data-category="image"]')).toHaveAttribute("hidden", "");
  await expect(title).toBeHidden();
  const filteredHeight = await expectUniformCards(page);
  expect(filteredHeight).toBeLessThan(initialHeight + 100);
  await page.locator(".redesign-software-category-trigger").click();
  await page.getByRole("button", { name: "All tools", exact: true }).click();
  await expect(title).toBeVisible();
  await expectUniformCards(page);
  expect((await cardSizes(page)).naturalMaximum).toBeGreaterThan(initialHeight + 100);
});
