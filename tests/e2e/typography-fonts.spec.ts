import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const oppoFontPath = "/fonts/oppo-sans-4/oppo-sans-4.0-4f58dbaeaea7.ttf";
const oppoFontHash = "4f58dbaeaea78ebe9dafaadd2bec60f50983ef15de31605beff55aac94420dd2";
const misansAssets = [
  { file: "MiSansLatin-Regular-fc17182f3f2b.woff2", bytes: 61_144, hash: "fc17182f3f2b941cef6ca1317cb50d556532fdff46d8c540234543947b9fa0e5" },
  { file: "MiSansLatin-Semibold-8d81deaf1c0f.woff2", bytes: 69_284, hash: "8d81deaf1c0fae067649d572171f63c08c2bb434c3a3263aa6f1c831282a2c46" },
  { file: "MiSansLatin-Bold-9dfe63a0d0b3.woff2", bytes: 69_772, hash: "9dfe63a0d0b3347f4c466f9ae58264a4a8df63c47660cab2a0c4b8c58c06461b" },
];
const firstFamily = (value: string) => value.split(",")[0].replace(/["']/g, "").trim();

test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page, baseURL }) => {
  const localOrigin = new URL(baseURL!).origin;
  await page.route((url) => url.origin !== localOrigin, (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function loadedFont(page: Page, family: string, text: string) {
  return page.evaluate(async ({ family, text }) => {
    const faces = await document.fonts.load(`400 20px "${family}"`, text);
    await document.fonts.ready;
    return faces.map((face) => ({ family: face.family.replace(/["']/g, ""), status: face.status }));
  }, { family, text });
}

test("the original OPPO font and full embedding license are served with stable asset integrity", async ({ request }) => {
  test.setTimeout(90_000);
  const response = await request.get(oppoFontPath);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toMatch(/max-age=31536000/);
  expect(response.headers()["cache-control"]).toContain("immutable");
  expect(response.headers()["content-type"]).toMatch(/font\/ttf|application\/(?:x-font-ttf|font-sfnt|octet-stream)/);
  const originalFont = await response.body();
  expect(originalFont.byteLength).toBe(22_775_460);
  expect(createHash("sha256").update(originalFont).digest("hex")).toBe(oppoFontHash);

  const license = await request.get("/fonts/oppo-sans-4/LICENSE.txt");
  expect(license.status()).toBe(200);
  const agreement = await license.text();
  expect(agreement).toContain("Copyright 2024 Guangdong OPPO Mobile Telecommunications Corp., Ltd.");
  expect(agreement).toContain("use, copy, merge, embed, bundle, redistribute and/or sell unmodified copies");
  expect(agreement).toContain("YOU shall retain the copyright notice and this Agreement");
  for (const asset of misansAssets) {
    const font = await request.get(`/fonts/misans-latin/${asset.file}`);
    expect(font.status()).toBe(200);
    expect(font.headers()["cache-control"]).toContain("immutable");
    expect(font.headers()["access-control-allow-origin"]).toBe("*");
    const bytes = await font.body();
    expect(bytes.byteLength).toBe(asset.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.hash);
  }
  const misansLicense = await request.get("/fonts/misans-latin/LICENSE.pdf");
  expect(misansLicense.status()).toBe(200);
  expect((await misansLicense.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

for (const locale of ["zh", "en"] as const) {
  for (const width of [390, 1440]) {
    test(`${locale} uses the downloaded UI font and preserves both homepage headlines at ${width}px`, async ({ page, baseURL, browserName }, testInfo) => {
      test.setTimeout(90_000);
      const family = locale === "zh" ? "OPPO Sans 4.0" : "MiSans";
      const fontResponses: string[] = [];
      const fontErrors: string[] = [];
      page.on("response", (response) => {
        if (response.ok() && new URL(response.url()).pathname.startsWith("/fonts/")) fontResponses.push(response.url());
      });
      page.on("console", (message) => {
        if (/OTS parsing error|Failed to decode downloaded font/.test(message.text())) fontErrors.push(message.text());
      });
      await page.context().addCookies([{ name: "enhe_locale", value: locale, url: baseURL! }]);
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(locale === "zh" ? "/" : "/en", { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      const faces = await loadedFont(page, family, locale === "zh" ? "中文界面人工智能工具" : "ENHE AI tools and community");
      expect(faces.length).toBeGreaterThan(0);
      expect(faces.every((face) => face.family === family && face.status === "loaded")).toBe(true);
      expect(fontResponses.some((url) => locale === "zh"
        ? new URL(url).pathname === oppoFontPath
        : new URL(url).pathname === `/fonts/misans-latin/${misansAssets[0].file}`)).toBe(true);
      expect(fontErrors).toEqual([]);

      const subtitle = page.locator(".redesign-home-subtitle");
      await expect(subtitle).toBeVisible();
      expect(firstFamily(await subtitle.evaluate((element) => getComputedStyle(element).fontFamily))).toBe(family);

      // Chromium reports the actual glyph provider, proving it used the network font rather than a system fallback.
      if (browserName === "chromium") {
        const session = await page.context().newCDPSession(page);
        await session.send("DOM.enable");
        await session.send("CSS.enable");
        const { root } = await session.send("DOM.getDocument");
        const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector: ".redesign-home-subtitle" });
        const { fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId });
        const internalFamily = locale === "zh" ? "OPPO Sans 4.0" : "MiSans Latin";
        expect(fonts.some((font) => font.familyName === internalFamily && font.isCustomFont && font.glyphCount > 0), JSON.stringify(fonts)).toBe(true);
        await session.detach();
      }

      const maskedHeadline = page.locator(".redesign-home-hero h1 > .masked-heading").first();
      expect(firstFamily(await maskedHeadline.evaluate((element) => getComputedStyle(element).fontFamily))).toBe("Microsoft YaHei");
      const footerHeadline = page.locator(".redesign-home-brand-value-inner h2");
      expect(firstFamily(await footerHeadline.evaluate((element) => getComputedStyle(element).fontFamily))).toBe("Microsoft YaHei");
      const mobileHeadline = page.locator(".redesign-home-mobile-title");
      if (width < 768) {
        await expect(mobileHeadline).toBeVisible();
        expect(firstFamily(await mobileHeadline.evaluate((element) => getComputedStyle(element).fontFamily))).toBe("ENHE Rounded");
        expect((await loadedFont(page, "ENHE Rounded", "AI一站式平台"))[0]?.status).toBe("loaded");
      } else {
        await expect(mobileHeadline).toBeHidden();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const homepageScreenshot = testInfo.outputPath("homepage-fonts.png");
      await page.screenshot({ path: homepageScreenshot });
      await testInfo.attach("homepage-fonts", { path: homepageScreenshot, contentType: "image/png" });
      const footerScreenshot = testInfo.outputPath("preserved-footer-headline.png");
      await page.locator(".redesign-home-brand-value").screenshot({ path: footerScreenshot });
      await testInfo.attach("preserved-footer-headline", { path: footerScreenshot, contentType: "image/png" });
    });
  }

  test(`${locale} about page visibly credits the embedded fonts and links the full license`, async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: "enhe_locale", value: locale, url: baseURL! }]);
    const response = await page.goto(locale === "zh" ? "/about" : "/en/about");
    expect(response?.status()).toBe(200);
    const notice = page.locator("#font-license");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("OPPO Sans");
    await expect(notice).toContainText("MiSans");
    await expect(notice.locator('a[href="/fonts/oppo-sans-4/LICENSE.txt"]')).toBeVisible();
    await expect(notice.locator('a[href="/fonts/misans-latin/LICENSE.pdf"]')).toBeVisible();
  });
}

for (const locale of ["zh", "en"] as const) {
  for (const width of [390, 1440]) {
    test(`${locale} standalone error pages load the site font at ${width}px`, async ({ page }) => {
      test.setTimeout(90_000);
      const family = locale === "zh" ? "OPPO Sans 4.0" : "MiSans";
      const fontPath = locale === "zh" ? oppoFontPath : `/fonts/misans-latin/${misansAssets[0].file}`;
      const fontResponses: string[] = [];
      page.on("response", (response) => {
        if (response.ok() && new URL(response.url()).pathname === fontPath) fontResponses.push(response.url());
      });
      await page.setViewportSize({ width, height: 900 });

      const missingPageResponse = await page.goto(locale === "zh" ? "/__font-audit-missing-page__" : "/en/__font-audit-missing-page__");
      expect(missingPageResponse?.status()).toBe(404);
      expect(await page.locator("html").getAttribute("lang")).toBe(locale === "zh" ? "zh-CN" : "en-US");
      expect(firstFamily(await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily))).toBe(family);
      expect((await loadedFont(page, family, locale === "zh" ? "页面未找到返回首页" : "Page not found Return home"))
        .every((face) => face.status === "loaded" && face.family === family)).toBe(true);
      expect(fontResponses.length).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

      const paymentReturnResponse = await page.goto("/api/zpay/return/font-audit-invalid-ticket");
      expect(paymentReturnResponse?.status()).toBe(410);
      expect(await page.locator("html").getAttribute("lang")).toBe("zh-CN");
      expect(firstFamily(await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily))).toBe("OPPO Sans 4.0");
      expect((await loadedFont(page, "OPPO Sans 4.0", "支付返回链接已失效请登录"))
        .every((face) => face.status === "loaded" && face.family === "OPPO Sans 4.0")).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }

  test(`${locale} real AI trend report srcdoc loads its font inside the restricted sandbox`, async ({ page, browserName }) => {
    test.setTimeout(90_000);
    if (browserName === "chromium") {
      // The fixture is loopback; public production assets do not need Chromium's local-network permission.
      await page.context().grantPermissions(["local-network-access"]);
    }
    const family = locale === "en" ? "MiSans" : "OPPO Sans 4.0";
    // Exercise the pure exported builder without importing its Next server page and database dependencies.
    const pageSource = readFileSync(path.join(process.cwd(), "src/app/ai-trends/daily/[date]/page-shell.tsx"), "utf8");
    const builderBody = pageSource.match(/export function buildAiTrendReportSrcDoc\(fullHtml: string, locale: Locale = "zh"\) \{([\s\S]*)\}\s*$/)?.[1];
    expect(builderBody).toBeTruthy();
    const buildSrcDoc = new Function("fullHtml", "locale", builderBody!) as (html: string, locale: string) => string;
    const srcdoc = buildSrcDoc(`<style>body { font-family: system-ui,"Microsoft YaHei",sans-serif; } .rank { font: 700 12px Consolas,monospace; }</style><p id="report-font-probe">${locale === "en" ? "AI trends report" : "中文人工智能趋势报告"}</p><span id="report-rank-probe" class="rank">1</span>`, locale);
    const fontResponses: Array<{ origin: string | undefined; mode: string | undefined; allowOrigin: string | undefined }> = [];
    page.on("response", async (response) => {
      const fontPath = new URL(response.url()).pathname;
      const isSelectedFont = locale === "en" ? fontPath.startsWith("/fonts/misans-latin/") : fontPath === oppoFontPath;
      if (isSelectedFont && response.request().frame() !== page.mainFrame()) {
        const requestHeaders = await response.request().allHeaders();
        fontResponses.push({ origin: requestHeaders.origin, mode: requestHeaders["sec-fetch-mode"], allowOrigin: response.headers()["access-control-allow-origin"] });
      }
    });
    const parentPath = locale === "en" ? "/en/about" : "/about";
    await page.route((url) => url.pathname === parentPath, async (route) => {
      const response = await route.fetch();
      // Keep the real response headers/CSP, but do not pre-load a parent font: WebKit shares decoded fonts between frames.
      await route.fulfill({ response, body: "<!doctype html><html><head><title>Font sandbox verification</title></head><body></body></html>" });
    });
    await page.goto(parentPath);
    // Retain the real page's response CSP and base URL; the iframe deliberately has no allow-same-origin or allow-scripts.
    await page.evaluate((html) => {
      const frame = document.createElement("iframe");
      frame.id = "report-sandbox-font-test";
      frame.setAttribute("sandbox", "allow-popups allow-popups-to-escape-sandbox");
      frame.srcdoc = html;
      document.body.append(frame);
    }, srcdoc);
    const frame = page.frameLocator("#report-sandbox-font-test");
    await expect(frame.locator("#report-font-probe")).toBeVisible();
    const reportFont = await frame.locator("#report-font-probe").evaluate(async (element, selectedFamily) => {
      const faces = await document.fonts.load(`400 20px "${selectedFamily}"`, element.textContent ?? "");
      await document.fonts.ready;
      return { family: getComputedStyle(element).fontFamily, loaded: faces.map((face) => face.status) };
    }, family);
    expect(firstFamily(reportFont.family)).toBe(family);
    expect(reportFont.loaded.length).toBeGreaterThan(0);
    expect(reportFont.loaded.every((status) => status === "loaded")).toBe(true);
    const rank = frame.locator("#report-rank-probe");
    expect(firstFamily(await rank.evaluate((element) => getComputedStyle(element).fontFamily))).toBe(family);
    await expect(rank).toHaveCSS("font-size", "12px");
    await expect(rank).toHaveCSS("font-weight", "700");
    await expect.poll(() => fontResponses.some((response) => response.allowOrigin === "*" && (
      browserName === "webkit"
        ? response.origin === undefined && response.mode === "no-cors"
        : response.origin === "null"
    ))).toBe(true);
  });
}
