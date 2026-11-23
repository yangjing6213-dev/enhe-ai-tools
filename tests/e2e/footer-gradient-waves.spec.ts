import { expect, test } from "@playwright/test";

test("mobile footer omits the dinosaur so footer controls stay unobstructed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });

  const footer = page.locator(".redesign-footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(page.getByTestId("footer-gradient-waves")).toHaveCount(0);
  await expect(page.locator(".redesign-footer-mascot")).toBeHidden();
});

test("desktop footer retains its mascot without the removed wave region", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "load" });

  const footer = page.locator(".redesign-footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(page.getByTestId("footer-gradient-waves")).toHaveCount(0);
  await expect(page.locator(".redesign-footer-mascot")).toBeVisible();
});
