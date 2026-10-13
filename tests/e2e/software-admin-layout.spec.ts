import { expect, test } from "@playwright/test";

test("software list columns stay compact and aligned", async ({ page, context, baseURL }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires the local read-only admin fixture.");
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL! }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/software");
  const table = page.locator('[data-tool-type="software"]');
  const heading = table.locator(".enhe-admin-tool-table-heading");
  // The read-only fixture intentionally has no list records; probe row styling without writing data.
  await table.evaluate(node => {
    const rows = document.createElement("div");
    rows.className = "enhe-admin-tool-list-rows min-w-[1080px]";
    rows.innerHTML = '<div class="enhe-admin-tool-list-row grid grid-cols-[1.4fr_0.8fr_0.6fr_0.8fr_1.1fr_0.6fr] items-center gap-4 px-5 py-4"><div>Long product name and bilingual title</div><div>Efficiency</div><div>Published</div><div>¥1.00</div><div>Ready to publish</div><div><a href="#">Edit</a></div></div>';
    node.append(rows);
  });
  const row = table.locator(".enhe-admin-tool-list-row").first();
  await expect(row).toBeVisible();
  await expect(heading).toHaveCSS("column-gap", "8px");
  await expect(row).toHaveCSS("column-gap", "8px");
  const starts = async (selector: string) => page.locator(selector).first().evaluate(node => Array.from(node.children).map(child => child.getBoundingClientRect().left));
  expect(await starts(".enhe-admin-tool-table-heading")).toEqual(await starts(".enhe-admin-tool-list-row"));
  await expect(heading).toHaveCSS("min-width", "900px");
  await row.locator("a").first().focus();
  await expect(page.locator(".enhe-edge-effect")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(await table.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
});
