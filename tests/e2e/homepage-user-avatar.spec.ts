import { expect, test } from "@playwright/test";

test("homepage reviews show user avatars and recover from failed images", async ({ page }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires local read-only fixture");
  await page.goto("/");
  await expect(page.locator("#redesign-home-reviews-heading")).toHaveText("用户评价");
  await expect(page.locator(".redesign-home-reviews-disclosure")).toHaveText("以下评论由真实用户提交评价");
  const avatar = page.locator(".redesign-home-review-avatar").first();
  await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await avatar.evaluate((img: HTMLImageElement) => { img.src = "/missing-test-avatar.png"; });
  await expect(avatar).toHaveAttribute("src", /images\/user-avatars\/avatar-\d{2}\.webp/);
  await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(256);
});
