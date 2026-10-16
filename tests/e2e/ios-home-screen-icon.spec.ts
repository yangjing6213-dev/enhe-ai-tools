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
    await expect(link).toHaveAttribute("href", "/apple-touch-icon-20261016.png");

    const declared = await request.get((await link.getAttribute("href"))!);
    expect(declared.status()).toBe(200);
    expect(declared.headers()["content-type"]).toMatch(/^image\/png/);
    const bytes = await declared.body();
    const metadata = await sharp(bytes).metadata();
    expect(metadata).toMatchObject({ format: "png", width: 180, height: 180, hasAlpha: false });

    const fallback = await request.get("/apple-touch-icon.png");
    expect(fallback.status()).toBe(200);
    expect((await fallback.body()).equals(bytes)).toBe(true);
  });
}

test("temporary iPhone probes differ only in icon delivery and cannot be indexed", async ({ page, request }) => {
  const html: string[] = [];
  const icons: Buffer[] = [];
  for (const variant of ["file", "inline"]) {
    const response = await page.goto(`/ios-icon-${variant}-20261016.html`, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toMatch(/^text\/html/);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow, noarchive");
    await expect(page.locator('head link[rel="manifest"]')).toHaveCount(0);
    const link = page.locator('head link[rel="apple-touch-icon"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("sizes", "180x180");
    const href = (await link.getAttribute("href"))!;
    if (variant === "file") {
      expect(href).toBe("/apple-touch-icon-20261016.png");
      const icon = await request.get(href);
      expect(icon.status()).toBe(200);
      icons.push(await icon.body());
    } else {
      expect(href).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/);
      icons.push(Buffer.from(href.split(",")[1], "base64"));
    }
    html.push((await response!.text()).replace(`href="${href}"`, 'href="ICON_DELIVERY"'));
  }
  expect(html[0]).toBe(html[1]);
  expect(icons[0].equals(icons[1])).toBe(true);
  expect(await sharp(icons[1]).metadata()).toMatchObject({ width: 180, height: 180, hasAlpha: false });
});
