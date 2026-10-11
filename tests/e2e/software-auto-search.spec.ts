import { expect, test } from "@playwright/test";

test("software search covers the whole catalog and stays next to the category control", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL?.includes("/enhe_ui_test"), "Requires the isolated synthetic UI database.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());

  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/software", { waitUntil: "networkidle" });
    const search = page.getByRole("searchbox", { name: "搜索工具名称或用途" });
    const category = page.getByRole("button", { name: "全部商品" });
    await expect(search).toBeVisible();
    const searchBox = await search.boundingBox();
    const categoryBox = await category.boundingBox();
    expect(searchBox!.x).toBeGreaterThan(categoryBox!.x + categoryBox!.width);
    expect(Math.abs(searchBox!.y - categoryBox!.y)).toBeLessThan(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator("[data-all-products-root] [data-catalog-card]")).toHaveCount(12);

    // Product 15 is outside the first catalog page; searching must still find it.
    await search.fill("独有搜索工具");
    await expect(page).toHaveURL(/q=/);
    await expect(page.locator("[data-all-products-root] [data-catalog-card]")).toHaveCount(1);
    await expect(page.locator("[data-all-products-root]")).toContainText("独有搜索工具");
    await expect(search).toHaveValue("独有搜索工具");
    await search.fill("没有这样的工具");
    await expect(page.locator("[data-all-products-root] [data-catalog-card]")).toHaveCount(0);
    await search.fill("");
    await expect(page.locator("[data-all-products-root] [data-catalog-card]")).toHaveCount(12);
    await expect(page).toHaveURL(/\/software$/);
  }
  expect(errors).toEqual([]);
});

test("software search preserves newer input while an earlier response is delayed", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL?.includes("/enhe_ui_test"), "Requires the isolated synthetic UI database.");
  await page.goto("/software", { waitUntil: "networkidle" });
  await page.route("**/software?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("q") === "本地") {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    await route.continue();
  });
  const search = page.getByRole("searchbox", { name: "搜索工具名称或用途" });
  await search.fill("本地");
  await page.waitForTimeout(300);
  await search.fill("独有搜索工具");
  await expect(page.locator("[data-all-products-root] [data-catalog-card]")).toHaveCount(1);
  await expect(search).toHaveValue("独有搜索工具");
  await expect(page).toHaveURL(/q=/);
});
