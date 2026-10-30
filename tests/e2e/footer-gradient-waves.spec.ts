import { expect, test } from "@playwright/test";

test("footer retains its mascot without the removed wave region", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });

  const footer = page.locator(".redesign-footer");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(page.getByTestId("footer-gradient-waves")).toHaveCount(0);
  await expect(page.locator(".redesign-footer-mascot")).toBeVisible();
});
