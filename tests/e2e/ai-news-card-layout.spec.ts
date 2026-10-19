import { expect, test } from "@playwright/test";

if (process.env.DATABASE_URL?.trim()) {
  throw new Error("AI News layout checks require an empty DATABASE_URL.");
}

for (const width of [390, 1440] as const) {
  test(`AI news cards use the available width and related tools stay compact at ${width}px`, async ({ page, baseURL }) => {
    expect(baseURL && new URL(baseURL).hostname).toMatch(/^(localhost|127\.0\.0\.1|\[::1\])$/);
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/ai-news", { waitUntil: "load" });
    expect(response?.status()).toBe(200);

    const contentContainer = page.locator(".ai-news-workspace-container");
    await contentContainer.evaluate((container) => container.classList.add("ai-news-page-container"));
    const geometry = await contentContainer.evaluate((container) => {
      const rect = container.getBoundingClientRect();
      return { width: rect.width, scrollWidth: document.documentElement.scrollWidth };
    });

    if (width >= 1024) {
      expect(geometry.width).toBeGreaterThanOrEqual(1280);
    } else {
      expect(geometry.width).toBeLessThanOrEqual(width);
      expect(geometry.width).toBeGreaterThanOrEqual(width - 80);
    }
    expect(geometry.scrollWidth).toBeLessThanOrEqual(width);

    const fixture = await page.locator("main.ai-news-page").evaluate((main) => {
      const container = main.querySelector<HTMLElement>(".ai-news-workspace-container");
      if (!container) throw new Error("AI News content container was not found.");

      const cover = document.createElement("div");
      cover.className = "ai-news-card-cover";
      const listingCard = document.createElement("article");
      listingCard.className = "ai-news-interactive-card";
      listingCard.append(cover);
      container.append(listingCard);

      main.classList.add("ai-news-detail-page");
      const relatedGrid = document.createElement("div");
      relatedGrid.className = "ai-news-related-tools-grid";
      const product = document.createElement("article");
      product.className = "tool-product-card tool-product-card-compact";
      const productCover = document.createElement("div");
      productCover.className = "tool-product-card-cover";
      const productBody = document.createElement("div");
      productBody.className = "tool-product-card-body tool-product-card-body-compact";
      const productTitle = document.createElement("h3");
      productTitle.textContent = "Related AI tool";
      const productSummary = document.createElement("p");
      productSummary.textContent = "A useful product description for this sample card.";
      productBody.append(productTitle, productSummary);
      product.append(productCover, productBody);
      relatedGrid.append(product);
      container.append(relatedGrid);

      const listingRect = listingCard.getBoundingClientRect();
      const coverHeight = cover.getBoundingClientRect().height;
      const cardRect = product.getBoundingClientRect();
      const productCoverRect = productCover.getBoundingClientRect();
      const productBodyRect = productBody.getBoundingClientRect();
      const columns = getComputedStyle(product).gridTemplateColumns.split(" ");
      return {
        listingWidth: listingRect.width,
        coverHeight,
        productWidth: cardRect.width,
        productHeight: cardRect.height,
        productColumns: columns.length,
        coverBeforeBody: productCoverRect.left < productBodyRect.left,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    const containerPadding = width >= 1024 ? 64 : 32;
    expect(fixture.listingWidth).toBeGreaterThanOrEqual(geometry.width - containerPadding - 1);
    if (width >= 1024) expect(fixture.coverHeight).toBeGreaterThanOrEqual(300);
    expect(fixture.productColumns).toBe(2);
    expect(fixture.coverBeforeBody).toBe(true);
    expect(fixture.productHeight).toBeLessThan(420);
    expect(fixture.scrollWidth).toBeLessThanOrEqual(width);
  });
}
