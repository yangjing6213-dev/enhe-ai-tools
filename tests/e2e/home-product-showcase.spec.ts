import { expect, test } from "@playwright/test";

test("shows the homepage featured products in a smaller borderless window and keeps navigation", async ({ page }) => {
  await page.goto("/");

  const stage = page.locator(".redesign-home-product-stage");
  const content = page.locator(".redesign-home-product-content");
  const frame = page.locator(".redesign-home-product-media-frame");

  await expect(page.getByText("热门AI推荐", { exact: true })).toBeVisible();
  await expect(stage).toBeVisible();
  await expect(content.locator("[data-product-current='true']")).toBeVisible();

  const showcaseSize = await content.evaluate((element) => {
    const stageWidth = element.parentElement?.getBoundingClientRect().width ?? 0;
    return element.getBoundingClientRect().width / stageWidth;
  });
  expect(showcaseSize).toBeGreaterThan(0.72);
  expect(showcaseSize).toBeLessThan(0.78);

  const frameStyle = await frame.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderWidth: style.borderWidth,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      transitionDuration: style.transitionDuration,
    };
  });
  expect(frameStyle).toEqual({
    borderWidth: "0px",
    borderRadius: "0px",
    boxShadow: "none",
    transitionDuration: "0s",
  });

  const activeProduct = content.locator("[data-product-current='true']");
  const firstProductId = await activeProduct.getAttribute("data-product-id");
  await page.getByRole("button", { name: "下一款产品" }).click();
  await expect(activeProduct).not.toHaveAttribute("data-product-id", firstProductId ?? "");
  await expect(content.getByRole("link", { name: "查看产品" })).toBeVisible();
  await expect(page.getByRole("button", { name: "显示第 2 款产品" })).toHaveAttribute("aria-current", "true");
});
