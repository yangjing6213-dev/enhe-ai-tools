import { describe, expect, it } from "vitest";
import { getLegalPage, legalSlugs } from "@/lib/legal";

function legalText(slug: (typeof legalSlugs)[number], locale: "zh" | "en") {
  const page = getLegalPage(slug, locale);
  expect(page).toBeDefined();
  return page!.sections
    .flatMap((section) => [section.title, ...section.paragraphs])
    .join(" ");
}

describe("legal content", () => {
  it.each(legalSlugs)("resolves %s in both locales", (slug) => {
    expect(getLegalPage(slug, "zh")?.slug).toBe(slug);
    expect(getLegalPage(slug, "en")?.slug).toBe(slug);
  });

  it("states the submitted-site permission and read-only boundaries", () => {
    const zh = legalText("user-agreement", "zh");
    const en = legalText("user-agreement", "en");

    expect(zh).toContain("有权提交并授权");
    expect(zh).toContain("只读");
    expect(zh).toContain("禁止");
    expect(en).toContain("right to submit");
    expect(en).toContain("read-only");
    expect(en.toLowerCase()).toContain("prohibited");
  });

  it("discloses audit data and report retention", () => {
    const zh = legalText("privacy-policy", "zh");
    const en = legalText("privacy-policy", "en");

    expect(zh).toContain("目标网址");
    expect(zh).toContain("哈希处理的 IP");
    expect(zh).toContain("180 天");
    expect(en).toContain("target URL");
    expect(en).toContain("hashed IP");
    expect(en).toContain("180 days");
  });

  it("does not promise ranking, indexing, or AI citations", () => {
    const zh = legalText("disclaimer", "zh");
    const en = legalText("disclaimer", "en");

    expect(zh).toContain("不保证搜索排名、搜索引擎收录或 AI 引用");
    expect(en).toContain("does not guarantee search rankings, search-engine indexing, or AI citations");
  });

  it("defines digital delivery, refund, and manual monitoring renewal", () => {
    const zh = legalText("membership-refund", "zh");
    const en = legalText("membership-refund", "en");

    expect(zh).toContain("数字化报告");
    expect(zh).toContain("30 天服务包");
    expect(zh).toContain("不会自动扣款");
    expect(en).toContain("digital report");
    expect(en).toContain("30-day service package");
    expect(en).toContain("no automatic debit");
  });
});
