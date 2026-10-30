import { expect, test } from "@playwright/test";

test("footer gradient waves render in a contained decorative region", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });

  const region = page.getByTestId("footer-gradient-waves");
  await expect(region).toBeVisible();
  await expect(region).toHaveAttribute("aria-hidden", "true");
  expect(await region.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(0);
  await expect(region.locator("canvas")).toHaveCount(1);
});
