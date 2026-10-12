import { expect, test } from "@playwright/test";

test("AI Skill page filters software-style cards as soon as the search text changes", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "1", "The preview route is only available in local development.");

  const response = await page.goto("/redesign-preview/ai-skills", { waitUntil: "load" });
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1, name: "AI Skill" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "搜索 Skill 名称或用途" });
  await expect(search).toBeVisible();
  await expect(page.locator("select")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "筛选" })).toHaveCount(0);

  const cards = page.locator(".redesign-software-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveCSS("height", "658px");
  await expect(cards.first()).toHaveCSS("border-radius", "0px");

  await search.fill("本地开发");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("本地开发排错 Skill");

  await search.fill("");
  await expect(cards).toHaveCount(2);
});

test("quick-access data is private to a signed-in user", async ({ request }) => {
  const response = await request.get("/api/user/quick-access?locale=zh");
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ hasUnread: false, orders: [], notifications: [] });
});