import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ prisma: {} }));
import { importAiNewsArticleInTransaction, type AiNewsImportTransaction } from "@/lib/ai-news-import";

describe("batch importer transaction seam", () => {
  it("uses the caller transaction and leaves existing category/tag status unchanged", async () => {
    const tx = {
      newsArticle: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }) => ({ ...data, id: "new-owned-id" })) },
      newsCategory: { upsert: vi.fn().mockResolvedValue({ id: "existing-category" }) },
      newsTag: { upsert: vi.fn().mockResolvedValue({ id: "existing-tag" }) },
      newsArticleTag: { deleteMany: vi.fn(), createMany: vi.fn() },
      newsExternalSource: { deleteMany: vi.fn(), createMany: vi.fn() }, adminAuditLog: { create: vi.fn() }
    };
    const article = await importAiNewsArticleInTransaction(tx as unknown as AiNewsImportTransaction, { publishMode: "draft", importBatchId: "local-slot", article: {
      title: "New bilingual story", summary: "Summary", content: "Local content", tags: ["Existing tag"],
      englishTitle: "New bilingual story in English", englishSummary: "English summary", englishContent: "English body",
      externalSources: [{ title: "Primary source", url: "https://example.org/announcement", sourceType: "primary" }]
    } });
    expect(article.id).toBe("new-owned-id");
    expect(tx.newsCategory.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    expect(tx.newsTag.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    expect(tx.newsArticleTag.deleteMany).toHaveBeenCalledWith({ where: { articleId: "new-owned-id" } });
    expect(tx.newsExternalSource.deleteMany).toHaveBeenCalledWith({ where: { articleId: "new-owned-id" } });
    expect(tx.newsArticle.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "draft", publishedAt: null, englishContent: "English body" }) }));
  });
});
