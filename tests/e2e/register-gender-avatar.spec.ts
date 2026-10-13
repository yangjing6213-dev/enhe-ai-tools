import { expect, test } from "@playwright/test";

for (const locale of ["zh", "en"] as const) {
  test(`${locale} registration lets users choose gender for their default avatar`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(locale === "en" ? "/en/register" : "/register");
    const gender = page.getByLabel(locale === "en" ? "Gender" : "性别", { exact: true });
    await expect(gender).toHaveValue("unspecified");
    await gender.selectOption("male");
    await expect(gender).toHaveValue("male");
    await gender.selectOption("female");
    await expect(gender).toHaveValue("female");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const pool of ["male", "female"]) {
      const response = await page.request.get(`/images/user-avatars/${pool}/avatar-01.webp`);
      expect(response.status()).toBe(200);
    }
  });
}
