import { expect, test } from "@playwright/test";

test("header avatar is small and aligned beside the username", async ({ page }) => {
  await page.route("**/api/user/avatar", route => route.fulfill({ status: 307, headers: { location: "/images/user-avatars/avatar-01.webp" } }));
  await page.goto("/redesign-preview/shell");
  for (const width of [1440, 1024, 800]) {
    await page.setViewportSize({ width, height: 1000 });
    const trigger = page.locator(".redesign-avatar-trigger").first();
    const avatar = trigger.locator("img");
    await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const metrics = await trigger.evaluate(element => {
      const image = element.querySelector("img")!.getBoundingClientRect();
      const name = element.querySelector("span")!.getBoundingClientRect();
      return { size: image.width, height: image.height, before: image.right <= name.left, center: Math.abs(image.top + image.height / 2 - name.top - name.height / 2), right: element.getBoundingClientRect().right };
    });
    expect(metrics.size).toBe(28);
    expect(metrics.height).toBe(28);
    expect(metrics.before).toBe(true);
    expect(metrics.center).toBeLessThan(2);
    expect(metrics.right).toBeLessThanOrEqual(width);
  }
});

test("tool category menu uses All tools and excludes AI Skill", async ({ page }) => {
  await page.goto("/redesign-preview/software");
  await expect(page.locator("#redesign-software-category-trigger")).toContainText("全部工具");
  await page.locator("#redesign-software-category-trigger").click();
  const options = page.locator(".redesign-software-category-button");
  await expect(options).toHaveCount(6);
  await expect(options.filter({ hasText: "AI Skill" })).toHaveCount(0);
});
