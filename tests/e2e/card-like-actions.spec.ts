import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && !!process.env.DATABASE_URL;
test.skip(!enabled, "Requires the dedicated local test database, never production data.");
// Stable across retries: public catalog caches must refer to the same disposable records.
const suffix = process.env.CARD_LIKES_E2E_RUN_ID ?? "card-like-e2e";
const toolId = `like-tool-${suffix}`;
const skillId = `like-skill-${suffix}`;
const newsId = `like-news-${suffix}`;
let db: PrismaClient;

test.beforeAll(async () => {
  if (!enabled) return;
  db = new PrismaClient();
  for (const [id, type] of [[toolId, "software"], [skillId, "ai_skill"]] as const) {
    await db.tool.create({ data: { id, slug: id, type, name: "喜欢按钮测试产品", englishName: "Card like test product", shortDescription: "[[zh]]用于验证卡片喜欢按钮，测试后删除。[[/zh]][[en]]A dedicated local test product for checking persistent card likes.[[/en]]", content: "[[zh]]仅用于本地测试。[[/zh]][[en]]Use this dedicated local test product to check repeated clicks, saved counts, language switches and accessible card controls.[[/en]]", status: "published", downloadCount: 7, usageCount: 12 } });
  }
  await db.newsArticle.create({ data: { id: newsId, slug: newsId, title: "喜欢按钮测试资讯", englishTitle: "Card like test news", summary: "验证卡片喜欢按钮。", englishSummary: "A dedicated local news article for checking saved card likes.", content: "仅用于测试。", englishContent: "This dedicated local news article checks repeated clicks, persistence, language switches and accessible card controls without changing production content. Readers can use the heart button independently of the article link, see the saved total after refreshing the page, and switch languages while keeping the same shared count. The test also checks large numbers and unsuccessful saves on a narrow mobile screen.", status: "published", publishedAt: new Date() } });
});
test.afterAll(async () => {
  if (!enabled) return;
  await db.siteSetting.deleteMany({ where: { key: { in: [toolId, skillId].map(id => `card-like:tool:${id}`) } } });
  await db.tool.deleteMany({ where: { id: { in: [toolId, skillId] } } });
  await db.newsArticle.deleteMany({ where: { id: newsId } });
  await db.$disconnect();
});

for (const [route, kind, id] of [["/software", "tool", toolId], ["/ai-skills", "tool", skillId], ["/ai-news", "news", newsId]] as const) {
  test(`each click persists, refreshes and shares bilingual totals on ${route}`, async ({ page }) => {
    await page.goto(route);
    const action = page.locator(`[data-card-like="${kind}:${id}"]`).first();
    const button = action.getByRole("button", { name: /喜欢/ });
    await expect(button).toBeVisible();
    expect(await button.evaluate(node => node.closest("a"))).toBeNull();
    const read = async () => (await (await page.request.get(`/api/card-likes?target=${kind}:${id}`)).json()).counts[`card-like:${kind}:${id}`] as number;
    const before = await read();
    for (let i = 1; i <= 2; i++) {
      await button.click();
      await expect.poll(read).toBe(before + i);
      await expect(button).toBeEnabled();
      await expect(action.locator(".pulse-heart__count")).toHaveText(String(before + i));
      expect(new URL(page.url()).pathname).toBe(route);
    }
    for (const duplicate of await page.locator(`[data-card-like="${kind}:${id}"]`).all()) {
      await expect(duplicate.locator(".pulse-heart__count")).toHaveText(String(before + 2));
    }
    await page.reload();
    await expect(action.locator(".pulse-heart__count")).toHaveText(String(before + 2));
    await page.goto(`/en${route}`);
    await expect(action.getByRole("button", { name: /Like/ })).toBeVisible();
    await expect(action.locator(".pulse-heart__count")).toHaveText(String(before + 2));
  });
  test(`mobile card controls fit and failed saves stay honest on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.route("**/api/card-likes?**", async route => {
      const response = await route.fetch();
      const body = await response.json();
      body.counts[`card-like:${kind}:${id}`] = 99_999_999;
      await route.fulfill({ response, json: body });
    });
    await page.goto(route);
    const action = page.locator(`[data-card-like="${kind}:${id}"]`).first();
    const button = action.getByRole("button", { name: /喜欢/ });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      for (const control of await page.locator(`[data-card-like="${kind}:${id}"] button`).all()) {
        await control.scrollIntoViewIfNeeded();
        const geometry = await control.evaluate(node => {
          const card = node.closest("article")!;
          const a = node.getBoundingClientRect(), b = card.getBoundingClientRect();
          const metrics = card.querySelector(".redesign-software-card-metrics")?.getBoundingClientRect();
          return { left: a.left >= b.left, right: a.right <= b.right, bottom: a.bottom <= b.bottom, height: a.height, overflow: document.documentElement.scrollWidth > innerWidth, metricsFit: !metrics || metrics.bottom <= a.top };
        });
        expect(geometry).toMatchObject({ left: true, right: true, bottom: true, overflow: false, metricsFit: true });
        expect(geometry.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page.setViewportSize({ width: 320, height: 850 });
    await expect(action.locator(".pulse-heart__count")).toHaveText("99,999,999");
    const before = (await action.locator(".pulse-heart__count").textContent())!;
    await page.route("**/api/card-likes", route => route.fulfill({ status: 503, json: { error: "UNAVAILABLE" } }));
    await button.click();
    await expect(action.getByRole("status")).toHaveText("未保存，请重试");
    await expect(button).toBeEnabled();
    await expect(action.locator(".pulse-heart__count")).toHaveText(before);
    await page.screenshot({ path: test.info().outputPath("card-like-mobile.png") });
  });
}
