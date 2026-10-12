import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { hashSessionToken, signSessionCookieValue } from "../../src/lib/auth-security";

const enabled = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1" && !!process.env.DATABASE_URL;
test.skip(!enabled, "Requires the dedicated local test database, never production data.");
// Stable across retries: public catalog caches must refer to the same disposable records.
const suffix = process.env.CARD_LIKES_E2E_RUN_ID ?? "card-like-e2e";
const toolId = `like-tool-${suffix}`;
const skillId = `like-skill-${suffix}`;
const newsId = `like-news-${suffix}`;
let db: PrismaClient;
const userId = `like-account-${suffix}`;
let cookieValue: string;

test.beforeAll(async () => {
  if (!enabled) return;
  db = new PrismaClient();
  await db.user.create({ data: { id: userId, passwordHash: "unused-local-test-hash", nickname: "测试用户" } });
  const token = randomBytes(32).toString("hex");
  const session = await db.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
  cookieValue = signSessionCookieValue(session.id, token, process.env.AUTH_SECRET!);
  for (const [id, type] of [[toolId, "software"], [skillId, "ai_skill"]] as const) {
    await db.tool.create({ data: { id, slug: id, type, name: "喜欢按钮测试产品", englishName: "Card like test product", shortDescription: "[[zh]]用于验证卡片喜欢按钮，测试后删除。[[/zh]][[en]]A dedicated local test product for checking persistent card likes.[[/en]]", content: "[[zh]]仅用于本地测试。[[/zh]][[en]]Use this dedicated local test product to check repeated clicks, saved counts, language switches and accessible card controls.[[/en]]", status: "published", downloadCount: 7, usageCount: 12 } });
  }
  await db.newsArticle.create({ data: { id: newsId, slug: newsId, title: "喜欢按钮测试资讯", englishTitle: "Card like test news", summary: "验证卡片喜欢按钮。", englishSummary: "A dedicated local news article for checking saved card likes.", content: "仅用于测试。", englishContent: "This dedicated local news article checks repeated clicks, persistence, language switches and accessible card controls without changing production content. Readers can use the heart button independently of the article link, see the saved total after refreshing the page, and switch languages while keeping the same shared count. The test also checks large numbers and unsuccessful saves on a narrow mobile screen.", status: "published", publishedAt: new Date() } });
  await db.comment.create({ data: { toolId, userId, content: "[[zh]]本地已审核评分测试[[/zh]][[en]]An approved local review for checking read-only star ratings.[[/en]]", rating: 4, status: "approved" } });
});
test.afterAll(async () => {
  if (!enabled) return;
  await db.comment.deleteMany({ where: { userId } });
  await db.siteSetting.deleteMany({ where: { key: { in: [toolId, skillId].map(id => `card-like:tool:${id}`) } } });
  await db.tool.deleteMany({ where: { id: { in: [toolId, skillId] } } });
  await db.newsArticle.deleteMany({ where: { id: newsId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "enhe_session", value: cookieValue, url: process.env.PLAYWRIGHT_BASE_URL! }]);
});
for (const [route, kind, id] of [["/software", "tool", toolId], ["/ai-skills", "tool", skillId], ["/ai-news", "news", newsId]] as const) {
  test(`account likes cancel, persist and share bilingual state on ${route}`, async ({ page }) => {
    await page.goto(route);
    const action = page.locator(`[data-card-like="${kind}:${id}"]`).first();
    const button = action.getByRole("button", { name: /喜欢/ });
    await expect(button).toBeVisible();
    await expect(action.locator(".pulse-heart__pill")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    expect(await button.evaluate(node => node.closest("a"))).toBeNull();
    const read = async () => (await (await page.request.get(`/api/card-likes?target=${kind}:${id}`)).json()).counts[`card-like:${kind}:${id}`] as number;
    const before = await read();
    for (let i = 1; i <= 2; i++) {
      await button.click();
      await expect.poll(read).toBe(before + (i === 1 ? 1 : 0));
      await expect(button).toBeEnabled();
      await expect(action.locator(".pulse-heart__count")).toHaveText(String(before + (i === 1 ? 1 : 0)));
      expect(new URL(page.url()).pathname).toBe(route);
    }
    for (const duplicate of await page.locator(`[data-card-like="${kind}:${id}"]`).all()) {
      await expect(duplicate.locator(".pulse-heart__count")).toHaveText(String(before));
    }
    await button.click();
    await expect.poll(read).toBe(before + 1);
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(action.locator(".pulse-heart__count")).toHaveText(String(before + 1));
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.goto(`/en${route}`);
    await expect(action.getByRole("button", { name: /Like/ })).toBeVisible();
    await expect(action.locator(".pulse-heart__count")).toHaveText(String(before + 1));
    await expect(action.getByRole("button", { name: /Like/ })).toHaveAttribute("aria-pressed", "true");
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

test("signed-out visitors are guided to login without modifying likes", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/software");
  await page.locator(`[data-card-like="tool:${toolId}"] button`).first().click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
});

test("another account sees its own state while totals stay shared", async ({ browser }) => {
  const secondId = `like-second-${suffix}`;
  const context = await browser.newContext();
  try {
    await context.addCookies([{ name: "enhe_session", value: cookieValue, url: process.env.PLAYWRIGHT_BASE_URL! }]);
    const saved = await context.request.post(`${process.env.PLAYWRIGHT_BASE_URL}/api/card-likes`, { headers: { Origin: process.env.PLAYWRIGHT_BASE_URL! }, data: { kind: "tool", id: toolId, liked: true } });
    expect(saved.status()).toBe(200);
    await context.clearCookies();
    await db.user.create({ data: { id: secondId, passwordHash: "unused-local-test-hash" } });
    const token = randomBytes(32).toString("hex");
    const session = await db.session.create({ data: { userId: secondId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
    await context.addCookies([{ name: "enhe_session", value: signSessionCookieValue(session.id, token, process.env.AUTH_SECRET!), url: process.env.PLAYWRIGHT_BASE_URL! }]);
    const page = await context.newPage();
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL}/software`);
    const action = page.locator(`[data-card-like="tool:${toolId}"]`).first();
    await expect(action.locator(".pulse-heart__count")).toHaveText("1");
    await expect(action.locator("button")).toHaveAttribute("aria-pressed", "false");
    const response = await context.request.get(`${process.env.PLAYWRIGHT_BASE_URL}/api/card-likes?target=tool:${toolId}`);
    expect((await response.json()).liked).toEqual({});
    await context.clearCookies();
    await context.addCookies([{ name: "enhe_session", value: cookieValue, url: process.env.PLAYWRIGHT_BASE_URL! }]);
    await page.reload();
    await expect(action.locator("button")).toHaveAttribute("aria-pressed", "true");
  } finally { await context.close(); await db.user.deleteMany({ where: { id: secondId } }); }
});

for (const [locale, width] of [["zh", 320], ["en", 1440]] as const) {
  test(`PeekRating selects, clears, supports keys and saves the score in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${locale === "en" ? "/en" : ""}/software/${toolId}`);
    const group = page.getByRole("radiogroup", { name: locale === "en" ? "Your rating" : "满意度评分" });
    const stars = group.getByRole("radio");
    await expect(stars).toHaveCount(5);
    const input = page.locator('input[name="rating"]');
    expect(await input.evaluate((node: HTMLInputElement) => node.checkValidity())).toBe(false);
    await stars.nth(4).hover();
    await expect(group.locator(".peek-rating__tip")).toHaveAttribute("data-show", "true");
    await stars.nth(4).click();
    await expect(input).toHaveValue("5");
    await stars.nth(4).click();
    await expect(input).toHaveValue("");
    expect(await input.evaluate((node: HTMLInputElement) => node.checkValidity())).toBe(false);
    await stars.first().focus();
    await stars.first().press("End");
    await expect(input).toHaveValue("5");
    await stars.nth(4).press("ArrowLeft");
    await expect(input).toHaveValue("4");
    await stars.nth(3).press(" ");
    await expect(input).toHaveValue("");
    await stars.first().press("Enter");
    await expect(input).toHaveValue("1");
    await stars.first().press("End");
    await stars.nth(4).press("ArrowLeft");
    await expect(input).toHaveValue("4");
    await expect(group.locator('.peek-rating__glyph[data-lit="true"]').first()).toHaveCSS("color", "rgb(245, 180, 0)");
    await expect(page.getByRole("img", { name: locale === "en" ? "4 out of 5 stars" : "4 星", exact: true })).toBeVisible();
    const content = `本地评分保存测试 ${locale} ${suffix}`;
    await page.locator("#tool-comment-content").fill(content);
    const submit = page.locator(".comment-submit-button");
    await expect(page.locator('.site-back-nav-button')).toHaveCount(1);
    await expect(page.locator('.tool-detail-page').getByRole('link', {name: locale === 'en' ? 'Back' : '返回', exact: true})).toHaveCount(0);
    for (const primary of await page.locator('.tool-detail-page [data-slot="button"][data-variant="default"]').all()) {
      await expect(primary).toHaveCSS("-webkit-text-fill-color", "rgb(255, 255, 255)");
      for (const child of await primary.locator('span').all()) await expect(child).toHaveCSS("-webkit-text-fill-color", "rgb(255, 255, 255)");
    }
    const card = page.locator('.tool-detail-page .glass').last();
    await card.hover();
    expect(await card.evaluate(n => getComputedStyle(n, '::after').display)).toBe('none');
    await expect(page.locator('.enhe-edge-effect')).toHaveCount(0);
    await submit.hover();
    await expect(submit).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(submit).toHaveCSS("-webkit-text-fill-color", "rgb(255, 255, 255)");
    await submit.click();
    await expect.poll(() => db.comment.count({ where: { toolId, userId, content, rating: 4, status: "pending" } })).toBe(1);
    await group.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.screenshot({ path: test.info().outputPath(`peek-rating-${locale}.png`) });
  });
}

test("touch rating clears correctly and reduced motion keeps stars still", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  try {
    await context.addCookies([{ name: "enhe_session", value: cookieValue, url: process.env.PLAYWRIGHT_BASE_URL! }]);
    const page = await context.newPage();
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL}/software/${toolId}`);
    const group = page.getByRole("radiogroup", { name: "满意度评分" });
    await group.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    const stars = group.getByRole("radio");
    await stars.nth(2).tap();
    await expect(page.locator('input[name="rating"]')).toHaveValue("3");
    await stars.nth(2).tap();
    await expect(page.locator('input[name="rating"]')).toHaveValue("");
    await stars.nth(4).tap();
    await expect(page.locator('input[name="rating"]')).toHaveValue("5");
    await expect(group.locator(".peek-rating__lift").first()).toHaveCSS("transform", "none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});
