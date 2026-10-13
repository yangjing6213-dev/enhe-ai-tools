import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const layout = readFileSync("src/app/admin/layout.tsx", "utf8");
const routes = [...new Set(Array.from(layout.matchAll(/\["[^"\n]+", "(\/admin[^"\n]*)"\]/g), match => match[1]))];
test.setTimeout(240_000);

test("all admin modules keep list columns aligned and within the viewport", async ({ page, context, baseURL }) => {
  test.skip(process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1", "Requires local read-only admin fixture.");
  await context.addCookies([{ name: "enhe_session", value: "fixture-only", url: baseURL! }]);
  await page.route("**/*", route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  for (const route of routes) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status(), route).toBe(200);
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('main :is(.enhe-admin-content-table, .enhe-admin-content-records, .enhe-admin-refund-records)').forEach(table => {
        const heading = table.querySelector<HTMLElement>(':scope > .grid');
        const rows = table.querySelector<HTMLElement>(':scope > [class*="divide-y"]');
        if (!heading || !rows) return;
        const row = document.createElement("div");
        row.className = heading.className.replace(/min-w-\[[^\]]+\]/g, "");
        row.dataset.spacingProbe = "grid";
        for (let index = 0; index < heading.children.length; index++) {
          const cell = document.createElement("div");
          cell.textContent = index === 0 ? "Long product title 中文标题 " + "unbroken".repeat(18) : index === heading.children.length - 1 ? "View / Edit" : "Published 999999";
          row.append(cell);
        }
        rows.append(row);
      });
      document.querySelectorAll<HTMLTableElement>("main table").forEach(table => {
        const head = table.tHead?.rows[0];
        if (!head || head.cells.length < 2) return;
        const body = table.tBodies[0] ?? table.createTBody();
        const row = body.insertRow();
        row.dataset.spacingProbe = "native";
        for (let index = 0; index < head.cells.length; index++) {
          row.insertCell().textContent = index === 0 ? "long-identifier".repeat(18) : "Account / Ready";
        }
      });
    });
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} viewport ${width}`).toBe(width);
      const pairs = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('main :is(.enhe-admin-content-table, .enhe-admin-content-records, .enhe-admin-refund-records) > [class*="divide-y"] > .grid')).map(row => {
        const heading = row.parentElement!.parentElement!.querySelector<HTMLElement>(':scope > .grid')!;
        return { head: Array.from(heading.children).map(cell => cell.getBoundingClientRect().left), body: Array.from(row.children).map(cell => cell.getBoundingClientRect().left), headWidth: heading.getBoundingClientRect().width, bodyWidth: row.getBoundingClientRect().width, gap: getComputedStyle(row).columnGap };
      }));
      const native = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLTableRowElement>('[data-spacing-probe="native"]')).map(row => ({ head: Array.from(row.closest("table")!.tHead!.rows[0].cells).map(cell => cell.getBoundingClientRect().left), body: Array.from(row.cells).map(cell => cell.getBoundingClientRect().left) })));
      for (const pair of native) pair.head.forEach((left, index) => expect(pair.body[index], `${route} native col ${index}`).toBeCloseTo(left, 1));
      for (const pair of pairs) {
        expect(pair.bodyWidth, route).toBeCloseTo(pair.headWidth, 1);
        expect(pair.gap, route).toBe("8px");
        pair.head.forEach((left, index) => expect(pair.body[index], `${route} col ${index}`).toBeCloseTo(left, 1));
      }
    }
  }
  console.log(`Audited ${routes.length} admin module routes at desktop, tablet and mobile widths.`);
});
