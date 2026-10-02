import { expect, test } from "@playwright/test";
import axe from "axe-core";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const routes = ["/", "/en", "/ai-news", "/en/ai-news", "/ai-news/topics/ai-agent", "/en/ai-news/topics/ai-agent"];

if (process.env.DATABASE_URL?.trim()) {
  throw new Error("The public contrast check requires an empty DATABASE_URL.");
}

for (const width of [390, 1440]) {
  for (const path of routes) {
    test(`${path} passes automated text contrast checks at ${width}px`, async ({ page, baseURL }, testInfo) => {
      test.setTimeout(60_000);
      if (!baseURL || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
        throw new Error("The contrast check requires a loopback website.");
      }
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === baseURL && url.pathname === "/api/analytics") {
          await route.fulfill({ status: 204 });
        } else if (url.origin !== baseURL || !["GET", "HEAD"].includes(request.method())) {
          errors.push(`Unexpected request: ${request.method()} ${url.pathname}`);
          await route.abort();
        } else {
          await route.continue();
        }
      });
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect((await page.goto(path, { waitUntil: "load" }))?.status()).toBe(200);
      await expect(page.locator("#main-content")).toBeVisible();
      await page.addScriptTag({ content: axe.source });
      const result = await page.evaluate(async () => {
        const report = await (window as unknown as { axe: typeof axe }).axe.run(document, {
          runOnly: { type: "rule", values: ["color-contrast"] },
        });
        const card = document.querySelector('.redesign-home-review-card[data-active="true"]');
        const stars = card?.querySelector(".redesign-home-review-stars");
        let starContrast: number | null = null;
        if (card && stars) {
          const context = document.createElement("canvas").getContext("2d");
          if (!context) throw new Error("Color measurement requires a canvas.");
          const luminance = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const channels = Array.from(context.getImageData(0, 0, 1, 1).data);
            if (channels[3] !== 255) throw new Error("This star check requires opaque colors.");
            return channels.slice(0, 3).reduce((sum, value, index) => {
              const channel = value / 255;
              return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
            }, 0);
          };
          const foreground = luminance(getComputedStyle(stars).color);
          const background = luminance(getComputedStyle(card).backgroundColor);
          starContrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
        }
        return { violations: report.violations, incomplete: report.incomplete, passes: report.passes.map((pass) => pass.id), starContrast };
      });
      const reportPath = testInfo.outputPath("contrast-results.json");
      await mkdir(dirname(reportPath), { recursive: true });
      await writeFile(reportPath, JSON.stringify(result, null, 2));
      await testInfo.attach("contrast-results", { path: reportPath, contentType: "application/json" });
      if (path === "/" || path === "/en") {
        await page.locator(".redesign-home-reviews").screenshot({ path: testInfo.outputPath("reviews-contrast.png") });
      }
      expect.soft(result.violations, `${path} at ${width}px`).toEqual([]);
      if (path === "/" || path === "/en") expect(result.starContrast).toBeGreaterThanOrEqual(3);
      expect(errors).toEqual([]);
    });
  }
}
