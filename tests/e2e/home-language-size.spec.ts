import { expect, test } from "@playwright/test";

test("homepage language switch matches navigation text and uses a smaller capsule", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator(".redesign-desktop-nav .enhe-language-toggle");
  const metrics = await toggle.evaluate(element => {
    const track = element.querySelector(".squish-switch__track")!.getBoundingClientRect();
    const label = element.querySelector(".redesign-language-link")!;
    const nav = document.querySelector(".redesign-desktop-nav .redesign-nav-link")!;
    return { width: track.width, height: track.height, labelFont: getComputedStyle(label).fontSize, navFont: getComputedStyle(nav).fontSize };
  });
  expect(metrics.width).toBe(68);
  expect(metrics.height).toBe(32);
  expect(metrics.labelFont).toBe(metrics.navFont);
  await toggle.locator('a[lang="en"]').click();
  await expect(page).toHaveURL(/\/en$/);
});
