import { expect, test } from "@playwright/test";

for (const route of [
  { path: "/ai-workflows", locale: "zh", title: "AI 工作流", searchLabel: "搜索中文名、仓库名、用途、主题或标签" },
  { path: "/en/ai-workflows", locale: "en", title: "AI Workflows", searchLabel: "Search Chinese name, repository, use case, topic, or tag" },
]) {
  test(`${route.locale} AI Workflows directory shows all workflows without the direction cards`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route.path, { waitUntil: "load" });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: route.searchLabel })).toBeVisible();
    await expect(page.getByRole("button", { name: route.locale === "en" ? "Apply filters" : "应用筛选" })).toHaveCSS("color", "rgb(255, 255, 255)");
    const directionsLabel = route.locale === "en" ? "AI application directions" : "AI 应用方向参考";
    await expect(page.getByRole("heading", { name: directionsLabel })).toHaveCount(0);
    await expect(page.getByRole("list", { name: directionsLabel })).toHaveCount(0);
    const heading = page.getByRole("heading", { name: route.locale === "en" ? "All workflows" : "全部工作流", exact: true });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS("font-size", "18px");
    await expect(page.getByText(route.locale === "en"
      ? "No workflow is published yet. Relevant projects with a clear license will appear as a downloadable package or a GitHub repository link."
      : "目前还没有已发布工作流。符合主题且许可清晰的项目会以可下载包或 GitHub 原仓库链接展示。",
    )).toBeVisible();
  });
}

test("AI Workflows search submits the workflow filters after the direction cards are removed", async ({ page }) => {
  const response = await page.goto("/ai-workflows", { waitUntil: "load" });
  expect(response?.status()).toBe(200);

  await page.getByRole("searchbox", { name: "搜索中文名、仓库名、用途、主题或标签" }).fill("SaaS");
  await page.getByRole("button", { name: "应用筛选", exact: true }).click();
  await expect(page).toHaveURL(/[?&]q=SaaS(?:&|$)/);
  await expect(page.getByRole("searchbox", { name: "搜索中文名、仓库名、用途、主题或标签" })).toHaveValue("SaaS");
  await expect(page.getByRole("heading", { name: "全部工作流", exact: true })).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`AI Workflows language switching stays on the directory at ${width}px`, async ({ page, context }) => {
    await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en/ai-workflows", { waitUntil: "load" });

    const toggle = page.locator(".redesign-header .enhe-language-toggle:visible");
    await expect(toggle.locator('a[lang="zh"]')).toHaveAttribute("href", "/ai-workflows");
    await toggle.getByRole("switch").click();
    await expect(page).toHaveURL((url) => url.pathname === "/ai-workflows");
    await expect(page.getByRole("heading", { level: 1, name: "AI 工作流", exact: true })).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === "enhe_locale")?.value).toBe("zh");

    await expect(toggle.locator('a[lang="en"]')).toHaveAttribute("href", "/en/ai-workflows");
    await toggle.getByRole("switch").focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL((url) => url.pathname === "/en/ai-workflows");
    await expect(page.getByRole("heading", { level: 1, name: "AI Workflows", exact: true })).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === "enhe_locale")?.value).toBe("en");
  });
}
