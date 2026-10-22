import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import axe from "axe-core";

const productStyles = [
  "src/app/globals.css",
  "src/styles/redesign/tokens.css",
  "src/styles/redesign/shell.css",
  "src/styles/redesign/site-refresh.css",
].map((path) => readFileSync(resolve(process.cwd(), path), "utf8")).join("\n");

for (const locale of ["zh", "en"] as const) {
  test(`footer logo and social links stay centered on mobile (${locale})`, async ({ page }) => {
    await page.goto(locale === "en" ? "/en" : "/");
    const footer = page.locator(".redesign-footer");
    await expect(footer.locator(".footer-social-links a")).toHaveCount(3);

    for (const width of [320, 390, 767, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await footer.scrollIntoViewIfNeeded();
      await expect.poll(() => footer.locator(".footer-brand-logo").evaluate((image) =>
        (image as HTMLImageElement).naturalWidth,
      )).toBeGreaterThan(0);
      const layout = await footer.evaluate((element) => {
        const bounds = (selector: string) =>
          element.querySelector(selector)!.getBoundingClientRect().toJSON();
        return {
          logo: bounds(".footer-brand-logo"),
          socials: bounds(".footer-social-links"),
          value: bounds(".redesign-home-brand-value"),
          navigation: bounds(".footer-navigation"),
          pageWidth: document.documentElement.scrollWidth,
        };
      });

      expect(layout.pageWidth, `page width at ${width}px`).toBeLessThanOrEqual(width);
      expect(layout.socials.top).toBeGreaterThanOrEqual(layout.logo.bottom);
      if (width < 768) {
        expect(Math.abs(layout.logo.x + layout.logo.width / 2 - width / 2)).toBeLessThanOrEqual(1);
        expect(Math.abs(layout.socials.x + layout.socials.width / 2 - width / 2)).toBeLessThanOrEqual(1);
        expect(layout.logo.x).toBeGreaterThanOrEqual(0);
        expect(layout.logo.right).toBeLessThanOrEqual(width);
      } else if (width >= 1280) {
        expect(layout.logo.right).toBeLessThan(layout.value.left);
        expect(layout.value.right).toBeLessThan(layout.navigation.left);
        expect(Math.abs(layout.value.x + layout.value.width / 2 - width / 2)).toBeLessThanOrEqual(1);
      }
    }
  });

  test(`product navigation CSS keeps links in document flow (${locale})`, async ({ page }) => {
    // Exercise the real responsive CSS without a database or network requests.
    await page.route("**/*", (route) => route.abort());
    const sections = ["tool-purchase", "tool-product-description", "tool-faq", "tool-related"];
    const labels = locale === "zh"
      ? ["购买", "产品介绍", "FAQ", "相关推荐"]
      : ["Buy", "Product introduction", "FAQ", "Related products"];
    await page.setContent(`
      <html lang="${locale}"><head><style>${productStyles}</style>
      <style>html { scroll-behavior: auto; }</style></head><body class="enhe-redesign-production"><main>
        <section id="tool-purchase" style="height: 900px">${labels[0]}</section>
        <nav class="tool-detail-mobile-toc" aria-label="Product detail sections">
          ${sections.map((id, index) => `<a href="#${id}">${labels[index]}</a>`).join("")}
        </nav>
        ${sections.slice(1).map((id, index) => `<section id="${id}" style="height: 1200px">${labels[index + 1]}</section>`).join("")}
      </main></body></html>
    `);
    await page.addScriptTag({ content: axe.source });
    const navigation = page.locator(".tool-detail-mobile-toc");

    for (const width of [320, 390, 767]) {
      await page.setViewportSize({ width, height: 900 });
      await navigation.scrollIntoViewIfNeeded();
      const contrast = await page.evaluate(async () => {
        const report = await (window as unknown as { axe: typeof axe }).axe.run(".tool-detail-mobile-toc", {
          runOnly: { type: "rule", values: ["color-contrast"] },
        });
        return { violations: report.violations, incomplete: report.incomplete };
      });
      expect(contrast).toEqual({ violations: [], incomplete: [] });
      for (const id of sections) {
        const link = navigation.locator(`a[href="#${id}"]`);
        await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
        await link.click();
        expect(await page.evaluate(() => location.hash)).toBe(`#${id}`);
        await expect.poll(() => page.locator(`#${id}`).evaluate((element) =>
          Math.abs(element.getBoundingClientRect().top),
        )).toBeLessThanOrEqual(1);
      }

      await navigation.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + bounds.bottom + 100, behavior: "instant" });
      });
      await expect.poll(() => navigation.evaluate((element) =>
        element.getBoundingClientRect().bottom,
      )).toBeLessThan(0);
      expect(await navigation.locator("a").evaluateAll((links) =>
        links.every((link) => {
          const bounds = link.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth && bounds.height >= 44;
        }),
      )).toBe(true);
    }

    for (const width of [768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(navigation).toBeHidden();
    }
  });
}

test.describe("product detail navigation on a local test database", () => {
  test.skip(!process.env.DATABASE_URL?.trim(), "Requires a local test database containing a published software product.");
  let productSlug: string;

  test.beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      const product = await prisma.tool.findFirst({
        where: { type: "software", status: "published" },
        select: { slug: true },
        orderBy: { createdAt: "asc" },
      });
      expect(product, "A published software product must be available in the local test database.").not.toBeNull();
      productSlug = product!.slug;
    } finally {
      await prisma.$disconnect();
    }
  });

  for (const locale of ["zh", "en"] as const) {
    test(`product section links work without following mobile scrolling (${locale})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${locale === "en" ? "/en" : ""}/software/${encodeURIComponent(productSlug)}`);
      const navigation = page.locator(".tool-detail-mobile-toc");

      for (const width of [320, 390, 767]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(navigation).toBeVisible();
        await expect(navigation).toHaveCSS("position", "static");
        for (const target of ["tool-purchase", "tool-product-description", "tool-faq", "tool-related"]) {
          const link = navigation.locator(`a[href="#${target}"]`);
          await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
          await link.click();
          await expect(page).toHaveURL(new RegExp(`#${target}$`));
          await expect.poll(() => page.locator(`#${target}`).evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            return bounds.top >= 0 && bounds.top < innerHeight;
          })).toBe(true);
        }

        await navigation.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          window.scrollTo({ top: window.scrollY + bounds.bottom + 100, behavior: "instant" });
        });
        await expect.poll(() => navigation.evaluate((element) =>
          element.getBoundingClientRect().bottom,
        )).toBeLessThan(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }

      for (const width of [768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(navigation).toBeHidden();
        await expect(page.locator("#tool-product-description")).toBeVisible();
      }
    });
  }
});
