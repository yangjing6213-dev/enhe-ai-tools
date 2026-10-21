import { expect, test } from "@playwright/test";

test.beforeEach(({ baseURL }) => {
  expect(baseURL && new URL(baseURL).hostname).toMatch(/^(localhost|127\.0\.0\.1|\[::1\])$/);
});

test("missing pages do not mix noindex with an inherited index directive", async ({ request }) => {
  const paths = ["/audit-route-that-does-not-exist", "/software?page=999999", "/en/software?page=999999", "/ai-news/audit-route-that-does-not-exist"];
  // The database-free news archive intentionally renders a preview at any page.
  if (process.env.DATABASE_URL?.trim()) paths.push("/ai-news/page/999999");
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    const html = await response.text();
    const robots = (html.match(/<meta\b[^>]*name="robots"[^>]*>/gi) ?? []).map((tag) => /content="([^"]*)"/i.exec(tag)?.[1] ?? "");
    expect(robots.some((value) => /\bnoindex\b/i.test(value))).toBe(true);
    expect(robots.some((value) => value.split(/[,\s]+/).includes("index"))).toBe(false);
  }
});

test("account shortcuts have their own named landmark", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "个人中心快捷入口", exact: true })).toBeVisible();
});

test("homepage headline stays accessible before JavaScript without a black fallback", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".redesign-home-hero h1")).toHaveAttribute("aria-label", /AI一站式平台/);
    const words = page.locator(".redesign-home-hero .masked-heading__word");
    expect(await words.count()).toBeGreaterThan(0);
    for (const word of await words.all()) {
      await expect(word).toBeVisible();
      expect(await word.evaluate((element) => getComputedStyle(element).webkitTextFillColor)).toBe("rgba(0, 0, 0, 0)");
    }
    expect(await page.locator(".redesign-home-hero .masked-heading__reveal").first().evaluate((element) => getComputedStyle(element).visibility)).toBe("visible");
  } finally {
    await context.close();
  }
});

test("homepage texture loads once and keeps the completed masked headline in reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const textures: string[] = [];
  page.on("request", (request) => { if (decodeURIComponent(request.url()).includes("blue-energy-city.webp")) textures.push(request.url()); });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator('.redesign-home-hero [data-mask-ready="true"]')).toHaveCount(2);
  expect(textures).toHaveLength(1);
  expect(await page.locator(".redesign-home-hero .masked-heading__reveal").first().evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
});
