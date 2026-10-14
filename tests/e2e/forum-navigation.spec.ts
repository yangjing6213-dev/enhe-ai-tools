import { expect, test } from "@playwright/test";

test("homepage exposes the community forum in Chinese and English navigation and hero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "共创AI", exact: true }).first()).toHaveAttribute("href", "/forum");
  await expect(page.getByRole("link", { name: "探索 AI 工具" })).toHaveAttribute("href", "/software");
  await expect(page.getByRole("link", { name: "共创AI论坛" })).toHaveAttribute("href", "/forum");
  const toolsBox = await page.getByRole("link", { name: "探索 AI 工具" }).boundingBox();
  const forumBox = await page.getByRole("link", { name: "共创AI论坛" }).boundingBox();
  expect(toolsBox).not.toBeNull();
  expect(forumBox).not.toBeNull();
  expect(Math.abs(forumBox!.y - toolsBox!.y)).toBeLessThan(2);
  expect(forumBox!.x).toBeGreaterThan(toolsBox!.x);
  const toolsStyle = await page.getByRole("link", { name: "探索 AI 工具" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius, fontSize: style.fontSize, height: style.height };
  });
  const forumStyle = await page.getByRole("link", { name: "共创AI论坛" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius, fontSize: style.fontSize, height: style.height };
  });
  expect(forumStyle).toEqual(toolsStyle);

  await page.goto("/en");
  await expect(page.getByRole("link", { name: "Co-create AI", exact: true }).first()).toHaveAttribute("href", "/en/forum");
  await expect(page.getByRole("link", { name: "Explore AI tools" })).toHaveAttribute("href", "/en/software");
  await expect(page.getByRole("link", { name: "Co-create AI Forum" })).toHaveAttribute("href", "/en/forum");
  await page.goto("/forum");
  await expect(page.getByRole("heading", { level: 1, name: "共创AI论坛" })).toBeVisible();
  await expect(page.getByRole("img", { name: "笔记本电脑和手机上的 ENHE 官网画面" })).toBeVisible();
  await page.goto("/en/forum");
  await expect(page.getByRole("heading", { level: 1, name: "AI Community Forum" })).toBeVisible();
});

test("homepage forum button stacks with the existing tool button on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toolsButton = page.getByRole("link", { name: "探索 AI 工具" });
  const forumButton = page.getByRole("link", { name: "共创AI论坛" });
  await expect(toolsButton).toBeVisible();
  await expect(forumButton).toBeVisible();
  const toolsBox = await toolsButton.boundingBox();
  const forumBox = await forumButton.boundingBox();
  expect(toolsBox).not.toBeNull();
  expect(forumBox).not.toBeNull();
  expect(forumBox!.y).toBeGreaterThan(toolsBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
