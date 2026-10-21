import { expect, test } from "@playwright/test";

for (const route of [
  { path: "/ai-workflows", locale: "zh", title: "AI 工作流", searchLabel: "搜索中文名、仓库名、用途、主题或标签" },
  { path: "/en/ai-workflows", locale: "en", title: "AI Workflows", searchLabel: "Search Chinese name, repository, use case, topic, or tag" },
]) {
  test(`${route.locale} AI Workflows directory renders categories and an honest empty state`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route.path, { waitUntil: "load" });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: route.searchLabel })).toBeVisible();
    const directions = page.getByRole("list", { name: route.locale === "en" ? "AI application directions" : "AI 应用方向参考" }).getByRole("listitem");
    await expect(directions).toHaveCount(10);
    await expect(page.getByRole("heading", { name: route.locale === "en" ? "Published workflows" : "已发布工作流" })).toBeVisible();
    await expect(page.getByText(route.locale === "en"
      ? "No workflow is published yet. Relevant projects with a clear license will appear as a downloadable package or a GitHub repository link."
      : "目前还没有已发布工作流。符合主题且许可清晰的项目会以可下载包或 GitHub 原仓库链接展示。",
    )).toBeVisible();
  });
}

test("AI Workflows category search filters the task directions", async ({ page }) => {
  const response = await page.goto("/ai-workflows", { waitUntil: "load" });
  expect(response?.status()).toBe(200);

  const directions = page.getByRole("list", { name: "AI 应用方向参考" }).getByRole("listitem");
  await expect(directions).toHaveCount(10);
  await page.getByRole("searchbox", { name: "搜索中文名、仓库名、用途、主题或标签" }).fill("SaaS");
  await expect(directions).toHaveCount(1);
  await expect(directions.first()).toContainText("工作效率");
});
