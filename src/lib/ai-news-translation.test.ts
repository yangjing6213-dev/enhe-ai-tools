import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("ai news translation service", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
  });

  it("rejects translation when API config is missing", async () => {
    const { generateAiNewsEnglishDraft } = await import("@/lib/ai-news-translation");

    await expect(
      generateAiNewsEnglishDraft({
        title: "中文标题",
        summary: "中文摘要",
        content: "## 标题\n\n正文",
        keyTakeaways: ["要点一"],
        seoTitle: "SEO 标题",
        seoDescription: "SEO 描述",
        keywords: "关键词"
      })
    ).rejects.toThrow("OPENAI_API_KEY");
  });

  it("returns structured english fields from a valid model response", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://example.com/v1";
    process.env.OPENAI_MODEL = "gpt-test";

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                englishTitle: "English title",
                englishSubtitle: "English subtitle",
                englishSummary: "English summary",
                englishContent: "## Heading\n\nEnglish body",
                englishKeyTakeaways: ["Takeaway 1"],
                englishImpactNotes: "Impact note",
                englishConclusion: "Conclusion",
                englishDescription: "English description",
                englishSeoTitle: "SEO title",
                englishSeoDescription: "SEO description",
                englishKeywords: "ai tools, account service",
                englishSeoKeywords: "ai tools, premium account service"
              })
            }
          }
        ]
      })
    });

    const { generateAiNewsEnglishDraft } = await import("@/lib/ai-news-translation");

    await expect(
      generateAiNewsEnglishDraft({
        title: "中文标题",
        subtitle: "中文副标题",
        summary: "中文摘要",
        content: "## 标题\n\n正文",
        keyTakeaways: ["要点一"],
        impactNotes: "影响说明",
        conclusion: "结论",
        seoTitle: "SEO 标题",
        seoDescription: "SEO 描述",
        keywords: "关键词"
      })
    ).resolves.toMatchObject({
      englishTitle: "English title",
      englishSummary: "English summary",
      englishContent: "## Heading\n\nEnglish body",
      englishKeyTakeaways: ["Takeaway 1"],
      englishDescription: "English description",
      englishSeoKeywords: "ai tools, premium account service"
    });
  });

  it("rejects invalid JSON model responses", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://example.com/v1";
    process.env.OPENAI_MODEL = "gpt-test";

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not-json" } }]
      })
    });

    const { generateAiNewsEnglishDraft } = await import("@/lib/ai-news-translation");

    await expect(
      generateAiNewsEnglishDraft({
        title: "中文标题",
        summary: "中文摘要",
        content: "## 标题\n\n正文",
        keyTakeaways: ["要点一"],
        seoTitle: "SEO 标题",
        seoDescription: "SEO 描述",
        keywords: "关键词"
      })
    ).rejects.toThrow("translation response");
  });
});
