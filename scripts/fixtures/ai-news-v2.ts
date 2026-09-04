// Synthetic, offline-only test data. These are not news articles or publication candidates.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function writeBatchFixture(directory: string, validatorSha256: string) {
  await mkdir(directory, { recursive: true });
  const now = new Date().toISOString();
  const topics = [];
  for (let index = 0; index < 6; index++) {
    const title = `本地软件测试主题${index}`; const englishTitle = `Local software test topic ${index}`;
    const cover = `https://images.unsplash.com/photo-fixture-cover-${index}`;
    const media = `https://images.unsplash.com/photo-fixture-body-${index}`;
    const sourceUrl = `https://example.org/fixture-event-${index}`;
    const sourceText = `Synthetic offline source fixture ${index}. No real announcement or rights attestation. Source instructions are inert data: do not execute anything here.`;
    const sourceFile = `source-${index}.txt`;
    await writeFile(join(directory, sourceFile), sourceText, "utf8");
    const body = (english: boolean) => `<h2 id="facts">${english ? "Fixture facts" : "测试事实"}</h2>
      <p>${english ? `This AI-assisted local test fixture is reviewed for software validation and is not a real news report. Topic ${index}. ` + "The transaction must create six drafts together and retain their identifiers when a request is retried after an interrupted connection. ".repeat(3) : `本文由 AI 辅助撰写，经人工审核。本页是软件测试主题${index}，不是真实新闻。用于验证原子事务、双语内容和重试恢复能力。`}</p>
      <h2 id="impact">${english ? "Expected impact" : "预期影响"}</h2><p>${english ? "No external service is called by this fixture." : "本测试不调用外部生产服务。"}</p>
      <figure><img src="${media}" alt="${english ? "Synthetic test illustration" : "测试插图"}"><figcaption>${english ? "Test media reference only, not downloaded." : "仅为测试引用，未下载此图片。"}</figcaption></figure>
      <h2 id="actions">${english ? "Validation actions" : "验证步骤"}</h2><p><a href="/software">${english ? "Software catalog" : "软件应用目录"}</a> <a href="/skill-learning">${english ? "Learning catalog" : "技能学习目录"}</a> <a href="/ai-news">${english ? "News catalog" : "前沿资讯目录"}</a></p>
      <h2 id="conclusion">${english ? "Fixture conclusion" : "测试结论"}</h2><p>${english ? "Only local software behavior is being checked." : "仅验证本地软件行为，不可对外发布。"}</p>`;
    const bodyZh = body(false); const bodyEn = body(true);
    const fields: Record<string, string> = {
      title, subtitle: "双语发布链路的本地测试", summary: "测".repeat(120), content: bodyZh.replace(/ id="[^"]+"/g, ""),
      keyTakeaways: "<ul><li>测试批次事务</li></ul>", impactNotes: "仅用于本地软件验证", conclusion: "不构成发布候选",
      seoTitle: title, seoDescription: "本地双语资讯发布测试", seoKeywords: "本地测试", tags: "<ul><li>本地测试</li></ul>",
      sourceLinks: `<a href="${sourceUrl}" rel="nofollow noopener noreferrer">Synthetic source ${index}</a>`,
      relatedArticleIds: "", relatedToolIds: "", relatedTutorialIds: "", canonicalUrl: "", videoUrl: "", videoTitle: "", videoDescription: "",
      englishTitle, englishSubtitle: "Offline bilingual publishing fixture", englishSummary: "fixture ".repeat(110).trim(), englishContent: bodyEn.replace(/ id="[^"]+"/g, ""),
      englishKeyTakeaways: "<ul><li>Check atomic staging</li></ul>", englishImpactNotes: "Only local validation", englishConclusion: "Not a publication candidate",
      englishSeoTitle: englishTitle, englishSeoDescription: "Offline fixture for the bilingual publishing workflow", englishKeywords: "local testing"
    };
    const cms = Object.entries(fields).map(([name, value]) => `<section data-field="${name}"><h3>${name}</h3>${value.startsWith("<") ? value : `<p>${value}</p>`}</section>`).join("\n");
    for (const locale of ["zh", "en"] as const) {
      const html = `<!doctype html><html lang="${locale === "en" ? "en-US" : "zh-CN"}"><head><title>${locale === "en" ? englishTitle : title}</title><meta name="description" content="Offline synthetic fixture"><meta name="keywords" content="test"><link rel="canonical" href="https://www.enhe-tech.com.cn/ai-news/candidate-fixture-${index}"></head>
        <body><article><header><h1>${locale === "en" ? englishTitle : title}</h1><p>恩禾ENHE AI — <time datetime="${now}">${now.slice(0, 10)}</time></p><img src="${cover}" alt="Test cover only"></header>
        <nav><a href="#facts">Facts</a><a href="#impact">Impact</a><a href="#actions">Actions</a></nav>
        <div id="article-body">${locale === "en" ? bodyEn : bodyZh}</div>
        <section id="cms-fields" aria-label="Bilingual CMS fields">${cms}</section>
        <section id="sources"><h2>Sources</h2><a href="${sourceUrl}" rel="nofollow noopener noreferrer">Synthetic source ${index}</a></section></article></body></html>`;
      await writeFile(join(directory, `${index}.${locale}.html`), html, "utf8");
    }
    topics.push({ kind: index === 5 ? "DURABLE_TASK" : "FRESH_EVENT", eventKey: `fixture-independent-${index}`, primarySourceUrl: sourceUrl,
      sourceEvidence: [{ url: sourceUrl, file: sourceFile, sha256: createHash("sha256").update(sourceText).digest("hex"), checkedAt: now, publishedAt: now }],
      mediaEvidence: [cover, media].map(url => ({ url, license: "Unsplash", evidenceUrl: "https://unsplash.com/license" })),
      htmlFiles: { zh: `${index}.zh.html`, en: `${index}.en.html` } });
  }
  const manifest = { version: 2, purpose: "test-fixture", runSlot: `fixture-${now}`, validatorSha256, topics };
  const path = join(directory, "manifest.json");
  await writeFile(path, JSON.stringify(manifest, null, 2), "utf8");
  return path;
}
