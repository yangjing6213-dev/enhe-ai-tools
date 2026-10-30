import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.use({
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  viewport: { width: 390, height: 844 },
  javaScriptEnabled: false,
});

for (const path of ["/", "/en"]) {
  test(`iPhone can discover and fetch the home-screen icon without JavaScript on ${path}`, async ({ page, request }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const link = page.locator('head link[rel="apple-touch-icon"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("sizes", "180x180");
    await expect(link).toHaveAttribute("href", "/apple-touch-icon-20261030.png");

    const declared = await request.get((await link.getAttribute("href"))!);
    expect(declared.status()).toBe(200);
    expect(declared.headers()["content-type"]).toMatch(/^image\/png/);
    const bytes = await declared.body();
    const metadata = await sharp(bytes).metadata();
    expect(metadata).toMatchObject({ format: "png", width: 180, height: 180, hasAlpha: false });
    const lowerEdge = await sharp(bytes).extract({ left: 90, top: 178, width: 1, height: 1 }).raw().toBuffer();
    expect(lowerEdge[0]).toBeLessThan(50);
    expect(lowerEdge[2]).toBeGreaterThan(200);

    const fallback = await request.get("/apple-touch-icon.png");
    expect(fallback.status()).toBe(200);
    expect((await fallback.body()).equals(bytes)).toBe(true);
  });
}
