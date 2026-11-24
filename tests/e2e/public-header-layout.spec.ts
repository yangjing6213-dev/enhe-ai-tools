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

test("forum editor actions use site blue and category dropdown has no arrow", async ({ page }) => {
  await page.goto("/en", { waitUntil: "load" });
  await page.evaluate(() => {
    const fixture = document.createElement("main");
    fixture.className = "forum-page";
    const realEditorButtonClasses = "rounded-lg border border-[var(--enhe-border,#d8d8d8)] px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 bg-white text-[var(--enhe-text,#080808)] rich-text-editor__action";
    fixture.innerHTML = `<section class="forum-form-card"><button class="forum-primary-button">Primary</button><div class="rich-text-editor__toolbar"><button class="${realEditorButtonClasses}">Bold</button><button class="${realEditorButtonClasses}">Link</button><button class="${realEditorButtonClasses}">Inline code</button><button class="${realEditorButtonClasses}">Code block</button></div><label><span>Category</span><span class="forum-form-select-control"><select><option>Help</option></select></span></label></section>`;
    document.body.append(fixture);
  });

  const colors = await page.evaluate(() => ({
    primary: getComputedStyle(document.querySelector(".forum-primary-button")!).backgroundColor,
    actions: Array.from(document.querySelectorAll(".rich-text-editor__action"), (button) => ({
      background: getComputedStyle(button).backgroundColor,
      text: getComputedStyle(button).color,
    })),
    arrowContent: getComputedStyle(document.querySelector(".forum-form-select-control")!, "::after").content,
    selectAppearance: getComputedStyle(document.querySelector(".forum-form-select-control select")!).appearance,
  }));
  expect(colors.actions).toHaveLength(4);
  for (const action of colors.actions) {
    expect(action.background).toBe("rgb(4, 98, 194)");
    expect(action.text).toBe("rgb(255, 255, 255)");
  }
  expect(colors.primary).toBe("rgb(4, 98, 194)");
  expect(colors.arrowContent).toBe("none");
  expect(colors.selectAppearance).toBe("none");
});
