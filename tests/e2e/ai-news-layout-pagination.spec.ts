import { expect, test } from "@playwright/test";

test.skip(!process.env.DATABASE_URL?.trim(), "AI news interaction requires the dedicated local test database.");

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
});

test("news modules stack, filters follow the heading, and tags stay readable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/ai-news", { waitUntil: "networkidle" });
  const cards = page.locator(".ai-news-latest-grid [data-news-id]");
  test.skip(await cards.count() === 0, "The dedicated database contains no published news fixture.");
  await expect(page.locator("[data-ai-news-lead-story]")).toHaveCount(0);
  const heading = await page.locator("main h1").boundingBox();
  const filter = await page.locator("#ai-news-search").boundingBox();
  expect(filter!.y).toBeGreaterThan(heading!.y + heading!.height);
  const positions = await page.evaluate(() => {
    const bounds = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    };
    const tagStyle = getComputedStyle(document.querySelector(".ai-news-card-tag")!);
    return {
      latest: bounds("[data-ai-news-region='latest']"),
      discovery: bounds(".ai-news-workspace-grid > section:last-child"),
      guide: bounds(".ai-news-guide"), faq: bounds(".ai-news-faq"),
      cover: bounds("[data-news-id] > a > div:first-child"), body: bounds(".ai-news-card-body"),
      tag: { color: tagStyle.color, background: tagStyle.backgroundColor },
    };
  });
  expect(positions.discovery.top).toBeGreaterThanOrEqual(positions.latest.bottom);
  expect(positions.faq.top).toBeGreaterThan(positions.guide.bottom);
  expect(positions.body.top).toBeGreaterThanOrEqual(positions.cover.bottom);
  expect(positions.tag).toEqual({ color: "rgb(4, 98, 194)", background: "rgb(255, 255, 255)" });
  expect(await page.locator(".ai-news-card-tag").evaluateAll((tags) => Math.max(...tags.map((tag) => tag.getBoundingClientRect().height)))).toBeLessThan(36);
  const subscribe = page.locator(".ai-news-subscribe-action");
  await subscribe.hover();
  await expect(subscribe).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(subscribe).toHaveCSS("background-color", "rgb(4, 98, 194)");
});

test("pagination updates only news, keeps surrounding positions and restores browser history", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/ai-news", { waitUntil: "networkidle" });
  const next = page.getByRole("link", { name: "下一页", exact: true });
  test.skip(await next.count() === 0, "The dedicated database requires at least ten published news fixtures.");
  const originalTitle = await page.locator("[data-news-id] h3").first().textContent();
  const documents: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.resourceType() === "document") documents.push(request.url());
  });
  await page.route("**/api/ai-news/listing?**", async (route) => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get("page"));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: pageNumber, pageCount: 2,
        languagePageCounts: { zh: 2, en: 2 },
        articles: [{ id: `page-${pageNumber}`, href: `/ai-news/page-${pageNumber}`, title: pageNumber === 2 ? "第二页的测试资讯" : originalTitle, summary: "测试摘要。".repeat(pageNumber === 2 ? 200 : 2), coverImage: null, categoryName: "AI资讯", isPinned: false, dateLabel: "2026/10/11", readingTime: 3, viewCount: 0, hasExternalSources: true, tags: [] }],
      }),
    });
  });
  await next.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => {
    const guide = document.querySelector(".ai-news-guide")!;
    guide.setAttribute("data-preserved", "yes");
    return { scroll: window.scrollY, guideTop: guide.getBoundingClientRect().top + window.scrollY };
  });
  await next.click();
  await expect(page.locator("[data-news-id] h3").first()).toHaveText("第二页的测试资讯");
  await expect(page).toHaveURL(/\/ai-news\/page\/2$/);
  await expect(page.locator('.redesign-desktop-nav .redesign-language-link[lang="en"]')).toHaveAttribute("href", "/en/ai-news/page/2");
  await expect(page.locator(".ai-news-guide")).toHaveAttribute("data-preserved", "yes");
  const after = await page.evaluate(() => ({ scroll: window.scrollY, guideTop: document.querySelector(".ai-news-guide")!.getBoundingClientRect().top + window.scrollY }));
  expect(Math.abs(after.scroll - before.scroll)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.guideTop - before.guideTop)).toBeLessThanOrEqual(2);
  expect(documents).toEqual([]);
  await page.goBack();
  await expect(page.locator("[data-news-id] h3").first()).toHaveText(originalTitle!);
  await expect(page).toHaveURL(/\/ai-news$/);
  await expect(page.locator('.redesign-desktop-nav .redesign-language-link[lang="en"]')).toHaveAttribute("href", "/en/ai-news");
  await expect(page.locator(".ai-news-guide")).toHaveAttribute("data-preserved", "yes");
});

test("a failed page request preserves the old news and current page", async ({ page }) => {
  await page.goto("/ai-news", { waitUntil: "networkidle" });
  const next = page.getByRole("link", { name: "下一页", exact: true });
  test.skip(await next.count() === 0, "The dedicated database requires at least ten published news fixtures.");
  const initialCards = await page.locator("[data-news-id]").evaluateAll((items) => items.map((item) => item.getAttribute("data-news-id")));
  const initialPagination = await page.locator(".ai-news-pagination").textContent();
  await page.route("**/api/ai-news/listing?**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Fixture request failed" }) }));
  await next.click();
  await expect(page.locator('.ai-news-listing-feedback[role="alert"]')).toHaveText("这页资讯暂时未能加载，请再试一次。");
  expect(await page.locator("[data-news-id]").evaluateAll((items) => items.map((item) => item.getAttribute("data-news-id")))).toEqual(initialCards);
  await expect(page).toHaveURL(/\/ai-news$/);
  await expect(page.locator(".ai-news-pagination")).toHaveText(initialPagination!);
});
