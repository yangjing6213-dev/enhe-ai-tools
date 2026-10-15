import { expect, test } from "@playwright/test";

test("homepage language switch keeps smaller text within the capsule", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator(".redesign-desktop-nav .enhe-language-toggle");
  const metrics = await toggle.evaluate(element => {
    const trackElement = element.querySelector(".squish-switch__track")!;
    const track = trackElement.getBoundingClientRect();
    const trackStyle = getComputedStyle(trackElement);
    const label = element.querySelector(".redesign-language-link")!;
    const nav = document.querySelector(".redesign-desktop-nav .redesign-nav-link")!;
    return { width: track.width, height: track.height, labelFont: getComputedStyle(label).fontSize, navFont: getComputedStyle(nav).fontSize, shadow: trackStyle.boxShadow, overflow: trackStyle.overflow };
  });
  expect(metrics.width).toBe(68);
  expect(metrics.height).toBe(32);
  expect(metrics.shadow).toBe("none");
  expect(metrics.overflow).toBe("hidden");
  expect(metrics.labelFont).toBe("11px");
  expect(parseFloat(metrics.labelFont)).toBeLessThan(parseFloat(metrics.navFont));
  await toggle.locator('a[lang="en"]').click();
  await expect(page).toHaveURL(/\/en$/);
});
