import { beforeEach, describe, expect, it, vi } from "vitest";

const generateDraft = vi.fn();
const requireAdmin = vi.fn();

vi.mock("@/lib/ai-news-translation", () => ({
  generateAiNewsEnglishDraft: generateDraft
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireAdmin
  };
});

describe("generateAiNewsEnglishDraftAction", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    generateDraft.mockReset();
    requireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("returns generated english fields without persisting the article", async () => {
    generateDraft.mockResolvedValue({
      englishTitle: "English title",
      englishSubtitle: "",
      englishSummary: "English summary",
      englishContent: "## Heading\n\nBody",
      englishKeyTakeaways: ["Takeaway"],
      englishImpactNotes: "",
      englishConclusion: "",
      englishDescription: "English description",
      englishSeoTitle: "SEO",
      englishSeoDescription: "SEO description",
      englishKeywords: "ai tools",
      englishSeoKeywords: "ai tools, ai account service"
    });

    const { generateAiNewsEnglishDraftAction } = await import("@/app/admin/actions");
    const formData = new FormData();
    formData.set("title", "中文标题");
    formData.set("summary", "中文摘要");
    formData.set("content", "## 标题\n\n正文");
    formData.set("keyTakeaways", "要点一");
    formData.set("seoTitle", "SEO 标题");
    formData.set("seoDescription", "SEO 描述");
    formData.set("keywords", "关键词");

    await expect(generateAiNewsEnglishDraftAction(null, formData)).resolves.toMatchObject({
      ok: true,
      data: {
        englishTitle: "English title",
        englishSummary: "English summary",
        englishContent: "## Heading\n\nBody",
        englishKeyTakeaways: ["Takeaway"],
        englishDescription: "English description",
        englishSeoKeywords: "ai tools, ai account service"
      }
    });
  }, 15000);
});
