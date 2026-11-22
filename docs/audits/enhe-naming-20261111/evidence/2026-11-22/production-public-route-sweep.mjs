import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";

const origin = "https://www.enhe-tech.com.cn";
const evidenceDir = new URL("./", import.meta.url);
const routes = [
  ["S01 home", "/"],
  ["S02 Chinese tools", "/software"],
  ["S03 Chinese tools page 2", "/software?page=2"],
  ["S04 English tools", "/en/software"],
  ["S05 AI resources", "/ai-skills"],
  ["F01 writing skill", "/ai-skills/ai-ai-skill"],
  ["S07 projects and resources", "/ai-workflows"],
  ["F08 New API project", "/ai-workflows/ai-workflow-717197250-new-api"],
  ["S09 Chinese prompt library", "/skill-learning/ai-prompt-management"],
  ["S10 Chinese courses", "/skill-learning"],
  ["S11 about Chinese", "/about"],
  ["S12 Chinese tool guides", "/tutorials"],
  ["S13 English tool guides", "/en/tutorials"],
  ["S14 Chinese news", "/ai-news"],
  ["S15 English news", "/en/ai-news"],
  ["S16 Chinese use cases", "/ai-trends"],
  ["S17 English use cases", "/en/ai-trends"],
  ["S18 English weekly reports", "/en/ai-trends/daily"],
  ["S19 English report 2026-11-09", "/en/ai-trends/daily/2026-11-09"],
  ["S20 English forum", "/en/forum"],
  ["S21 English courses", "/en/skill-learning"],
  ["S22 about English", "/en/about"],
  ["S23 English prompt library", "/en/skill-learning/ai-prompt-management"],
  ["S24 Codex Provider Switcher zh", "/software/codex-api"],
  ["S25 Codex Provider Switcher en", "/en/software/codex-api"],
  ["S26 AgentGuardian en", "/en/software/ai-ai-zorvp8"],
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/158.0.4370.33/msedge.exe",
  args: ["--no-sandbox"],
});
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(String(error)));
const results = [];

for (const [id, path] of routes) {
  try {
    const response = await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(650);
    const details = await page.evaluate(() => {
      const body = document.body?.innerText ?? "";
      const footer = [...document.querySelectorAll("footer a")].map(a => ({
        text: (a.innerText || a.getAttribute("aria-label") || "").trim(),
        href: a.getAttribute("href"),
      })).filter(item => item.text || item.href);
      const nav = [...document.querySelectorAll("header nav a, [role=navigation] a")].map(a => ({
        text: (a.innerText || a.getAttribute("aria-label") || "").trim(),
        href: a.getAttribute("href"),
      })).filter(item => item.text || item.href);
      const selects = [...document.querySelectorAll("select")].map(select => ({
        name: select.getAttribute("name"),
        aria: select.getAttribute("aria-label"),
        options: [...select.options].map(option => ({ text: option.text.trim(), value: option.value })),
      }));
      const headings = [...document.querySelectorAll("h1,h2,h3")].slice(0, 35).map(h => h.innerText.trim()).filter(Boolean);
      const breadcrumbs = [...document.querySelectorAll('[aria-label*=breadcrumb i], nav[aria-label*=breadcrumb i]')].map(el => el.innerText.trim()).filter(Boolean);
      const links = [...document.querySelectorAll("a")].map(a => ({ text: (a.innerText || a.getAttribute("aria-label") || "").trim(), href: a.getAttribute("href") })).filter(x => x.text || x.href);
      const faq = document.querySelector("#tool-faq")?.innerText.trim() ?? "";
      const courses = [...document.querySelectorAll(".tool-product-card")].map(card => ({
        title: card.querySelector("h2,h3")?.innerText.trim() ?? "",
        value: card.querySelector("p")?.innerText.trim() ?? "",
      }));
      const forms = [...document.querySelectorAll("form")].map(form => ({
        action: form.getAttribute("action"),
        method: form.method,
        fields: [...form.querySelectorAll("input,select,button")].map(field => ({
          name: field.getAttribute("name"),
          type: field.getAttribute("type"),
          text: field instanceof HTMLButtonElement ? field.innerText.trim() : "",
          options: field instanceof HTMLSelectElement ? [...field.options].map(option => ({ text: option.text.trim(), value: option.value })) : undefined,
        })),
      }));
      return {
        title: document.title,
        lang: document.documentElement.lang,
        h1: document.querySelector("h1")?.innerText.trim() ?? "",
        headings,
        breadcrumbs,
        faqText: faq,
        aboutFaqContactPresent: Boolean(document.getElementById("faq-contact")),
        courseCards: courses,
        forms,
        pageWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyTextLength: body.length,
        markers: {
          objectPlaceholder: body.includes("[object Object]"),
          undefinedPlaceholder: /\bundefined\b/i.test(body),
          localeMarker: /\[\[(zh|en)\]\]/i.test(body),
          accountServiceFaq: /AI account service|AI账号服务|账号与订阅/.test(body),
          newApiDeploymentNote: /需自行部署|Deployment Required/i.test(body),
          englishSummaryUnavailable: /English summary unavailable/i.test(body),
          readableReportButtons: /View Report Details|View Source/.test(body),
          productTypeLabels: /Tool Overview|Skill Overview|工具介绍|技能说明/.test(body),
          faqAnchor: /faq/i.test(location.hash) || links.some(link => /faq/i.test(link.href || "")),
          valueFragments: /Value\s*:\s*(Practice AI image|Turn common writing)/i.test(body),
          chineseSiteLabelsOnEnglish: /AI资讯|登录后|浏览AI工具|共创AI社区/.test(body),
        },
        nav,
        footer,
        selects,
        keyLinks: links.filter(link => /faq|help|tutorial|guide|order|software|community|forum|news|resource|daily|source|original|download|api/i.test(`${link.text} ${link.href}`)).slice(0, 100),
        bodyExcerpt: body.slice(0, 9000),
      };
    });
    results.push({ id, path, requested: `${origin}${path}`, finalUrl: page.url(), httpStatus: response?.status() ?? null, ...details });
  } catch (error) {
    results.push({ id, path, requested: `${origin}${path}`, error: String(error) });
  }
}

const prompts = {};
for (const locale of ["zh", "en"]) {
  const response = await context.request.get(`${origin}/data/ai-prompt-management/${locale}.json`);
  const data = await response.json();
  prompts[locale] = {
    status: response.status(),
    generatedAt: data.generatedAt,
    total: data.total,
    categoryCount: data.categories?.length,
    categories: data.categories,
    entries: data.entries?.length,
    titlesWithMasterOrGenius: data.entries?.filter(entry => /大师|大神/.test(entry.title)).length ?? null,
    redBookCategoryCount: data.entries?.filter(entry => entry.category === "红书").length ?? null,
    sample: data.entries?.filter(entry => ["curated-问答-项目起名大师", "curated-职场-excel函数大神"].includes(entry.id)).map(({ id, category, title }) => ({ id, category, title })),
  };
}

const namingRoutes = JSON.parse(await readFile(new URL("n20-live-detail-routes.json", evidenceDir), "utf8"));
const namingDetailSurfaces = [];
for (const route of namingRoutes) {
  try {
    const response = await page.goto(route.finalUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(500);
    const observed = await page.evaluate(() => {
      const body = document.body?.innerText ?? "";
      return {
        title: document.title,
        lang: document.documentElement.lang,
        h1: document.querySelector("h1")?.innerText.trim() ?? "",
        breadcrumbs: [...document.querySelectorAll('[aria-label*=breadcrumb i], nav[aria-label*=breadcrumb i]')].map(el => el.innerText.trim()).filter(Boolean),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        objectPlaceholder: body.includes("[object Object]"),
        undefinedPlaceholder: /\bundefined\b/i.test(body),
        localeMarker: /\[\[(zh|en)\]\]/i.test(body),
        chineseCharacters: (body.match(/\p{Script=Han}/gu) ?? []).length,
        visibleCoverAlt: [...document.querySelectorAll("main img")].slice(0, 4).map(image => image.getAttribute("alt")),
      };
    });
    namingDetailSurfaces.push({ ref: route.ref, locale: route.locale, expectedName: route.expectedName, requestedUrl: route.finalUrl, httpStatus: response?.status() ?? null, matched: observed.h1 === route.expectedName, ...observed });
  } catch (error) {
    namingDetailSurfaces.push({ ref: route.ref, locale: route.locale, expectedName: route.expectedName, requestedUrl: route.finalUrl, error: String(error) });
  }
}

const output = { capturedAt: new Date().toISOString(), viewport: { width: 1366, height: 768 }, routeCount: results.length, routes: results, namingDetailCount: namingDetailSurfaces.length, namingDetailSurfaces, prompts, pageErrors: errors };
await writeFile(new URL("production-public-route-sweep.json", evidenceDir), JSON.stringify(output, null, 2));
await browser.close();
console.log(JSON.stringify({ capturedAt: output.capturedAt, routeCount: results.length, failures: results.filter(r => r.httpStatus !== 200 || r.error).map(r => ({ id: r.id, status: r.httpStatus, error: r.error })), promptSummary: prompts, pageErrors: errors.length }, null, 2));
