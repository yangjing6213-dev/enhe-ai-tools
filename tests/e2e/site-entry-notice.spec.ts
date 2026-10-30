import { expect, test } from "@playwright/test";

test("routine browser checks start with the entry notice already dismissed", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  expect(await page.evaluate(() => localStorage.getItem("enhe-entry-notice-dismissed-v1"))).toBe("1");
  const search = page.getByRole("combobox", { name: "搜索产品" });
  await search.fill("ENHE");
  await expect(search).toHaveValue("ENHE");
  await expect(page.getByRole("dialog", { name: "本站最新公告通知" })).toHaveCount(0);
});

test.describe("new visitors", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const locale of [
    { route: "/", title: "本站最新公告通知", close: "关闭公告", qr: "扫码收藏网站" },
    { route: "/en", title: "Latest Site Announcement", close: "Close announcement", qr: "Scan to bookmark this site" },
  ]) {
    test(`shows and dismisses the ${locale.route === "/" ? "Chinese" : "English"} site entry notice`, async ({ page }) => {
      await page.goto(locale.route, { waitUntil: "load" });

      const dialog = page.getByRole("dialog", { name: locale.title });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("img", { name: locale.qr })).toBeVisible();

      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        await expect.poll(async () => {
          const bounds = await dialog.boundingBox();
          if (!bounds) return Number.POSITIVE_INFINITY;
          return Math.max(
            Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2),
            Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2),
          );
        }).toBeLessThanOrEqual(1);
        const closeBounds = await dialog.getByRole("button", { name: locale.close }).boundingBox();
        expect(closeBounds).not.toBeNull();
        expect(closeBounds!.y).toBeGreaterThanOrEqual(8);
        expect(closeBounds!.y + closeBounds!.height).toBeLessThanOrEqual(viewport.height - 8);
      }

      const footer = page.locator(".redesign-footer");
      await expect(footer.getByRole("img", { name: /bookmark|收藏/ })).toHaveCount(0);

      await page.getByRole("button", { name: locale.close }).click();
      await expect(dialog).toBeHidden();

      await page.reload({ waitUntil: "load" });
      await expect(dialog).toBeHidden();
    });
  }
});
