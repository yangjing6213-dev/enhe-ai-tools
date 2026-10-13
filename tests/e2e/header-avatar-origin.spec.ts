import { expect, test } from "@playwright/test";

test("header avatar redirects to a browser-accessible image and loads", async ({ page, request, baseURL }) => {
  const response = await request.get("/api/user/avatar", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const location = response.headers().location;
  expect(location).toMatch(/^\/images\/user-avatars\//);
  expect(new URL(location, baseURL).origin).toBe(new URL(baseURL!).origin);
  const imageResponse = await page.goto(location);
  expect(imageResponse?.status()).toBe(200);
  const avatar = page.locator("img").first();
  await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(256);
});
