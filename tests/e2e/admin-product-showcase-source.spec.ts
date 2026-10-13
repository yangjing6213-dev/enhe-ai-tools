import { expect, test } from "@playwright/test";
import { HOME_PRODUCTS } from "../../src/lib/redesign/home/home-products";

test("demo administration separately lists the same five homepage products", async ({ page, context, baseURL }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires isolated read-only admin fixture");
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL! }]);
  await page.goto("/admin/product-demos");
  await expect(page.getByRole("heading", { name: "首页当前展示产品（5 项）" })).toBeVisible();
  await expect(page.locator("[data-home-showcase-product]")).toHaveCount(HOME_PRODUCTS.length);
  for (const product of HOME_PRODUCTS) {
    const row = page.locator(`[data-home-showcase-product="${product.id}"]`);
    await expect(row).toContainText(product.name.zh);
    await expect(row.getByRole("link")).toHaveAttribute("href", product.detailHref.zh);
  }
  await expect(page.getByRole("heading", { name: "视频演示记录", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
