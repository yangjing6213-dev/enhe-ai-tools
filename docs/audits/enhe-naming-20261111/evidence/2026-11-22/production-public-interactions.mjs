import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const origin = "https://www.enhe-tech.com.cn";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/158.0.4370.33/msedge.exe",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.setDefaultTimeout(7000);
const errors = [];
page.on("pageerror", error => errors.push(String(error)));

async function dismissNotice() {
  await page.waitForTimeout(1200);
  const button = page.locator('dialog[open] button[aria-label="Close announcement"],dialog[open] button[aria-label="关闭公告"]').first();
  if (await button.count()) {
    await button.click({ timeout: 2000, force: true }).catch(() => {});
    await page.locator("dialog[open]").waitFor({ state: "hidden", timeout: 2000 }).catch(() => {});
  }
}

async function currentSummary() {
  return page.evaluate(() => {
    const main = document.querySelector("main")?.innerText ?? document.body.innerText;
    const cards = [...document.querySelectorAll("main article, main .tool-product-card")].slice(0, 3).map(card => card.innerText.trim().slice(0, 700));
    return { url: location.href, title: document.title, h1: document.querySelector("h1")?.innerText.trim() ?? "", cards, mainExcerpt: main.slice(0, 1800) };
  });
}

const result = { capturedAt: new Date().toISOString(), checks: {}, pageErrors: errors };

await page.goto(`${origin}/en/ai-news`, { waitUntil: "domcontentloaded", timeout: 40000 });
await dismissNotice();
const newsSelect = page.locator('form[action="/en/ai-news"] select[name="category"]');
const categoryCounts = await newsSelect.locator("option").count();
const filterResults = [];
for (const label of ["Tool Selection Guides", "API Security Guides"]) {
  await newsSelect.selectOption({ label });
  await page.getByRole("button", { name: "Filter news" }).click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await dismissNotice();
  filterResults.push({ selected: label, ...(await currentSummary()) });
}
result.checks.englishNewsTwoCategories = { optionCount: categoryCounts, results: filterResults, distinctFirstCard: filterResults[0].cards[0] !== filterResults[1].cards[0] };

await page.goto(`${origin}/ai-news`, { waitUntil: "domcontentloaded", timeout: 40000 });
await dismissNotice();
const newsPageOne = await currentSummary();
const nextLink = page.getByRole("link", { name: /下一页|Next page/i }).first();
result.checks.newsPagination = { pageOne: newsPageOne.url, nextLinkCount: await page.getByRole("link", { name: /下一页|Next page/i }).count() };
if (await nextLink.count()) {
  await nextLink.click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await dismissNotice();
  result.checks.newsPagination.pageTwo = await currentSummary();
}

for (const [key, startUrl, switchLabel, backLabel, expectedStart, expectedTarget] of [
  ["forum", `${origin}/forum`, "EN", "中文", `${origin}/forum`, `${origin}/en/forum`],
  ["codexDetail", `${origin}/software/codex-api`, "EN", "中文", `${origin}/software/codex-api`, `${origin}/en/software/codex-api`],
  ["weeklyReport", `${origin}/en/ai-trends/daily`, "中文", "EN", `${origin}/en/ai-trends/daily`, `${origin}/ai-trends/daily`],
]) {
  await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
  await dismissNotice();
  await page.getByRole("link", { name: switchLabel, exact: true }).first().click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await dismissNotice();
  const clickedUrl = page.url();
  await page.getByRole("link", { name: backLabel, exact: true }).first().click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await dismissNotice();
  const backUrl = page.url();
  result.checks[key + "LanguageSwitch"] = { startUrl: expectedStart, clickedUrl, expectedTarget, backUrl: backUrl.replace(origin, ""), startRouteBack: backUrl === expectedStart, passes: clickedUrl === expectedTarget && backUrl === expectedStart };
}

await writeFile(new URL("production-public-interactions.json", import.meta.url), JSON.stringify(result, null, 2));
await browser.close();
console.log(JSON.stringify({ capturedAt: result.capturedAt, checks: Object.fromEntries(Object.entries(result.checks).map(([key, value]) => [key, key === "englishNewsTwoCategories" ? { optionCount: value.optionCount, distinctFirstCard: value.distinctFirstCard, labels: value.results.map(item => item.selected) } : value])), pageErrors: errors.length }, null, 2));
