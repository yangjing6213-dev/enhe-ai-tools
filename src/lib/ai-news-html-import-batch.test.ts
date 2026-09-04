import { describe, expect, it } from "vitest";
import { buildAiNewsImportPayloadFromHtml } from "@/lib/ai-news-html-import";

describe("bilingual batch HTML import", () => {
  it("uses the same explicit bilingual CMS fields from each localized artifact only when requested", () => {
    const html = `<html lang="en"><head><meta name="keywords" content="English keywords"></head><article><h1>English visible title</h1><p>English visible body</p>
      <section id="cms-fields"><section data-field="title"><h3>Title</h3><p>中文正式标题</p></section><section data-field="content"><h3>Content</h3><p>中文正式正文</p></section>
      <section data-field="summary"><p>中文摘要</p></section><section data-field="seoKeywords"><p>中文关键词</p></section><section data-field="tags"><p>中文标签</p></section>
      <section data-field="englishTitle"><p>English visible title</p></section><section data-field="englishContent"><p>English visible body</p></section></section>
      <h2>Sources</h2><a href="https://example.org/source">Primary source</a></article></html>`;
    const legacy = buildAiNewsImportPayloadFromHtml({ html });
    const batch = buildAiNewsImportPayloadFromHtml({ html, preferCmsArticleFields: true });
    expect(legacy.article.title).toBe("English visible title");
    expect(batch.article.title).toBe("中文正式标题");
    expect(batch.article.content).toBe("中文正式正文");
    expect(batch.article.tags).toEqual(["中文标签"]);
    expect(batch.article.keywords).toBe("中文关键词");
  });
});
