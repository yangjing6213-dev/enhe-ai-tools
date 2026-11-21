import { expect, test } from "@playwright/test";

test("homepage exposes the community forum in Chinese and English navigation and hero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "AI社区", exact: true }).first()).toHaveAttribute("href", "/forum");
  await expect(page.getByRole("link", { name: "探索 AI 工具" })).toHaveAttribute("href", "/software");
  await expect(page.getByRole("link", { name: "进入AI社区" })).toHaveAttribute("href", "/forum");
  const toolsBox = await page.getByRole("link", { name: "探索 AI 工具" }).boundingBox();
  const forumBox = await page.getByRole("link", { name: "进入AI社区" }).boundingBox();
  expect(toolsBox).not.toBeNull();
  expect(forumBox).not.toBeNull();
  expect(Math.abs(forumBox!.y - toolsBox!.y)).toBeLessThan(2);
  expect(forumBox!.x).toBeGreaterThan(toolsBox!.x);
  const toolsStyle = await page.getByRole("link", { name: "探索 AI 工具" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius, fontSize: style.fontSize, height: style.height };
  });
  const forumStyle = await page.getByRole("link", { name: "进入AI社区" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius, fontSize: style.fontSize, height: style.height };
  });
  expect(forumStyle).toEqual(toolsStyle);

  await page.goto("/forum", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "共创AI论坛" })).toBeVisible();
  await expect(page.getByRole("img", { name: "笔记本电脑和手机上的 ENHE 官网画面" })).toBeVisible();

  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "AI Community", exact: true }).first()).toHaveAttribute("href", "/en/forum");
  await expect(page.getByRole("link", { name: "Explore AI tools" })).toHaveAttribute("href", "/en/software");
  await expect(page.getByRole("link", { name: "Explore the AI Community" })).toHaveAttribute("href", "/en/forum");
  await page.goto("/en/forum", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "AI Community Forum" })).toBeVisible();
});

test("mobile homepage shows stacked route cards without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const cards = page.locator(".redesign-home-mobile-cards");
  await expect(cards).toBeVisible();
  const toolsCard = cards.locator('a[href="/software"]');
  const forumCard = cards.locator('a[href="/forum"]');
  const newsCard = cards.locator('a[href="/ai-news"]');
  await expect(toolsCard).toBeVisible();
  await expect(forumCard).toBeVisible();
  await expect(newsCard).toBeVisible();
  const toolsBox = await toolsCard.boundingBox();
  const forumBox = await forumCard.boundingBox();
  const newsBox = await newsCard.boundingBox();
  expect(toolsBox).not.toBeNull();
  expect(forumBox).not.toBeNull();
  expect(forumBox!.y).toBeGreaterThan(toolsBox!.y);
  expect(newsBox).not.toBeNull();
  expect(newsBox!.y).toBeGreaterThan(forumBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
