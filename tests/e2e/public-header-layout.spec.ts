import { expect, test } from "@playwright/test";

test.describe("English public header layout", () => {
  for (const width of [900, 1024, 1100, 1280, 1366, 1440, 1600, 1920, 2087]) {
    test(`keeps search separate from the first navigation link at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/en", { waitUntil: "load" });

      const search = page.locator(".redesign-header[data-locale='en'] .redesign-header-search input");
      const firstNavLink = page.locator(".redesign-header[data-locale='en'] .redesign-desktop-nav-list a.redesign-nav-link").first();
      await expect(search).toBeVisible();
      await expect(firstNavLink).toHaveText("Home");
      const [searchBounds, linkBounds] = await Promise.all([search.boundingBox(), firstNavLink.boundingBox()]);
      expect(searchBounds).not.toBeNull();
      expect(linkBounds).not.toBeNull();
      expect(searchBounds!.width).toBeGreaterThanOrEqual(220);
      const overlaps = searchBounds!.x < linkBounds!.x + linkBounds!.width
        && searchBounds!.x + searchBounds!.width > linkBounds!.x
        && searchBounds!.y < linkBounds!.y + linkBounds!.height
        && searchBounds!.y + searchBounds!.height > linkBounds!.y;
      expect(overlaps).toBe(false);
      if (Math.abs(searchBounds!.y - linkBounds!.y) < 4) {
        expect(searchBounds!.x + searchBounds!.width + 16).toBeLessThanOrEqual(linkBounds!.x);
      }
    });
  }
});

test("forum editor actions use white text on site blue with an inset category arrow", async ({ page }) => {
  await page.goto("/en", { waitUntil: "load" });
  await page.evaluate(() => {
    const fixture = document.createElement("main");
    fixture.className = "forum-page";
    fixture.innerHTML = '<section class="forum-form-card"><button class="forum-primary-button">Primary</button><button class="rich-text-editor__action">Bold</button><label><span>Category</span><span class="forum-form-select-control"><select><option>Help</option></select></span></label></section>';
    document.body.append(fixture);
  });

  const colors = await page.evaluate(() => ({
    action: getComputedStyle(document.querySelector(".rich-text-editor__action")!).backgroundColor,
    primary: getComputedStyle(document.querySelector(".forum-primary-button")!).backgroundColor,
    text: getComputedStyle(document.querySelector(".rich-text-editor__action")!).color,
    arrowRight: getComputedStyle(document.querySelector(".forum-form-select-control")!, "::after").right,
  }));
  expect(colors.action).toBe(colors.primary);
  expect(colors.text).toBe("rgb(255, 255, 255)");
  expect(colors.arrowRight).toBe("18px");
});
