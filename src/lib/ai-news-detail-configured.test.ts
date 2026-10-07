import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publicContent = vi.hoisted(() => ({
  getPublicNewsArticleBySlug: vi.fn(),
  resolvePublicNewsArticleSlug: vi.fn(),
}));

vi.mock("@/lib/public-content", () => publicContent);

import { generateAiNewsDetailPageMetadata } from "@/app/ai-news/[slug]/page-shell";

const configuredArticle = {
  id: "configured-news",
  slug: "canonical-news",
  title: "已核验的 AI 工作流更新",
  subtitle: "一条用于 metadata fixture 的中文副标题",
  summary: "这是一条用于验证详情页 metadata 的中文摘要。",
  description: "这是一条用于验证详情页 metadata 的中文描述。",
  englishTitle: "How AI assistants improve daily workflows",
  englishSubtitle: "A configured metadata fixture",
  englishSummary:
    "This English summary explains how AI assistants improve daily workflows for teams and independent creators.",
  englishDescription:
    "This configured fixture describes a practical AI workflow update with enough context for indexable metadata.",
  content: "中文内容。",
  englishContent: Array.from(
    { length: 55 },
    () => "AI assistants help teams plan, review, and automate repeatable work.",
  ).join(" "),
  seoTitle: "AI 工作流更新",
  englishSeoTitle: "AI workflow update",
  seoDescription: "中文 SEO 描述。",
  englishSeoDescription: "A concise English SEO description for the configured fixture.",
  category: { name: "AI News" },
  coverImage: null,
  keyTakeaways: [],
  englishKeyTakeaways: [],
  impactNotes: null,
  englishImpactNotes: null,
  conclusion: null,
  englishConclusion: null,
};

describe("AI News detail configured metadata", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    vi.clearAllMocks();
    publicContent.resolvePublicNewsArticleSlug.mockResolvedValue({
      slug: "canonical-news",
      canonicalSlug: "canonical-news",
    });
    publicContent.getPublicNewsArticleBySlug.mockResolvedValue(
      configuredArticle,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves the canonical slug and returns indexable English metadata", async () => {
    const metadata = await generateAiNewsDetailPageMetadata(
      "en",
      "legacy-news",
    );

    expect(publicContent.resolvePublicNewsArticleSlug).toHaveBeenCalledWith(
      "legacy-news",
    );
    expect(publicContent.getPublicNewsArticleBySlug).toHaveBeenCalledWith(
      "canonical-news",
    );
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/en/ai-news/canonical-news",
    );
    expect(metadata.alternates?.languages?.["zh-CN"]).toBe(
      "https://www.enhe-tech.com.cn/ai-news/canonical-news",
    );
    expect(String(metadata.title)).toContain("AI workflow update");
    expect(String(metadata.description)).toContain("English SEO description");
  });

  it("keeps unknown configured slugs on fallback metadata without an article read", async () => {
    publicContent.resolvePublicNewsArticleSlug.mockResolvedValueOnce(null);

    const metadata = await generateAiNewsDetailPageMetadata(
      "zh",
      "missing-news",
    );

    expect(publicContent.resolvePublicNewsArticleSlug).toHaveBeenCalledWith(
      "missing-news",
    );
    expect(publicContent.getPublicNewsArticleBySlug).not.toHaveBeenCalled();
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/ai-news/missing-news",
    );
    expect(String(metadata.description)).toContain("关注 AI 工具");
  });

  it("keeps the resolved canonical fallback when the article lookup is empty", async () => {
    publicContent.getPublicNewsArticleBySlug.mockResolvedValueOnce(null);

    const metadata = await generateAiNewsDetailPageMetadata(
      "en",
      "legacy-news",
    );

    expect(publicContent.resolvePublicNewsArticleSlug).toHaveBeenCalledWith(
      "legacy-news",
    );
    expect(publicContent.getPublicNewsArticleBySlug).toHaveBeenCalledWith(
      "canonical-news",
    );
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/en/ai-news/canonical-news",
    );
    expect(String(metadata.description)).toContain("Track AI tools");
  });
});
