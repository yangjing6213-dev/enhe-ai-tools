import { expect, test } from "@playwright/test";

for (const prefix of ["", "/en"]) {
  test(`${prefix || "zh"} homepage keeps matching action typography and omits only its own breadcrumb`, async ({ page }) => {
    await page.goto(prefix || "/");
    await expect(page.locator(".site-breadcrumbs")).toHaveCount(0);
    const actions = page.locator(".redesign-home-cta");
    await expect(actions).toHaveCount(2);
    const typography = await actions.evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, synthesis: style.fontSynthesis, lineHeight: style.lineHeight };
    }));
    expect(typography[1]).toEqual(typography[0]);

    await actions.first().click();
    await expect(page).toHaveURL(`${prefix}/software`);
    await expect(page.locator(".site-breadcrumbs")).toBeVisible();
    await expect(page.locator(".site-breadcrumbs a").first()).toHaveAttribute("href", prefix || "/");
  });
}

test("English hero uses the same bold typeface as the Chinese hero", async ({ page }) => {
  const typography = [];
  for (const path of ["/", "/en"]) {
    await page.goto(path);
    const heading = page.locator(".redesign-home-animated-line").first();
    await expect(heading).toHaveAttribute("data-mask-ready", "true");
    typography.push(await heading.evaluate(element => {
      const style = getComputedStyle(element);
      return { font: style.fontFamily, weight: style.fontWeight, synthesis: style.fontSynthesis };
    }));
  }
  expect(typography[1]).toEqual(typography[0]);
  expect(Number(typography[1].weight)).toBeGreaterThanOrEqual(700);
});

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
