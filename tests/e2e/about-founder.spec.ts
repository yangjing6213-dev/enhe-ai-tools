import { expect, test } from "@playwright/test";

for (const [locale, route] of [["zh", "/about"], ["en", "/en/about"]] as const) {
  for (const width of [320, 1440]) {
    test(`founder portrait and contacts work in ${locale} at ${width}px`, async ({ page, baseURL }) => {
      await page.context().addCookies([{ name: "enhe_locale", value: locale, url: baseURL! }]);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const section = page.locator(".about-founder");
      await section.scrollIntoViewIfNeeded();
      await expect(section.getByRole("heading", { level: 2 })).toHaveText(locale === "zh" ? "网站创始人" : "Website Founder");
      expect(await section.evaluate(node => !!node.nextElementSibling?.classList.contains("enhe-reference-editorial-links"))).toBe(true);
      await expect(section).toHaveCSS("border-width", "0px");
      const profile = section.locator(".rb-profile");
      await expect(profile.locator(".rb-profile__rim")).toBeHidden();
      await expect(profile.locator(".rb-profile__tile-rim")).toBeHidden();
      await expect(profile.locator(".rb-profile__body")).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(profile.locator(".rb-profile__scrim")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(profile.locator(".rb-profile__scrim")).not.toHaveCSS("background-image", "none");
      await expect(profile.locator(".rb-profile__info")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect.poll(() => profile.locator(".rb-profile__photo").evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(1000);
      await expect(profile.locator(".rb-profile__photo")).toHaveCSS("max-width", "none");
      await expect(profile.locator(".rb-profile__name")).toHaveText("Enhe（恩禾）");
      await expect(profile.locator(".rb-profile__contact")).toHaveAttribute("href", "mailto:amen.enhe@gmail.com");
      await expect(profile.locator(".rb-profile__contact")).toHaveCSS("color", "rgb(244, 244, 245)");
      const contacts = section.locator(".about-founder-contacts");
      await expect(contacts.locator('a[href="https://github.com/yangjing6213-dev"]')).toHaveText("yangjing6213-dev");
      await expect(contacts.locator('a[href="https://x.com/Amenenhe_ai"]')).toHaveText("Amenenhe_ai");
      await expect(contacts.locator('a[href="https://www.enhe-tech.com.cn/"]')).toHaveText("www.enhe-tech.com.cn");
      await expect(contacts.locator('a[href="mailto:amen.enhe@gmail.com"]')).toBeVisible();
      await expect(contacts).toContainText("ENHE-AI");
      await profile.locator(".rb-profile__contact").focus();
      await expect(profile.locator(".rb-profile__contact")).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}

test("founder tilt responds to the mouse and respects reduced motion and touch", async ({ page }) => {
  await page.goto("/about");
  const profile = page.locator(".about-founder-profile");
  await profile.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const rotation = () => profile.evaluate(node => node.style.getPropertyValue("--pc-rotate-y"));
  await expect.poll(rotation).toBe("0.000deg");
  await profile.hover({ position: { x: 30, y: 80 } });
  await page.waitForTimeout(150);
  await expect.poll(rotation).toBe("0.000deg");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await profile.hover({ position: { x: 290, y: 100 } });
  await expect.poll(rotation).not.toBe("0.000deg");
  await page.mouse.move(0, 0);
  await expect.poll(rotation).toBe("0.000deg");
  await profile.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 12, clientX: 100, clientY: 100 });
  await page.waitForTimeout(150);
  await expect.poll(rotation).toBe("0.000deg");
});
