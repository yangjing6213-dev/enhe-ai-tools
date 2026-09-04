import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  newsArticle: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  newsCategory: {
    upsert: vi.fn()
  },
  newsTag: {
    upsert: vi.fn()
  },
  newsArticleTag: {
    deleteMany: vi.fn(),
    createMany: vi.fn()
  },
  newsExternalSource: {
    deleteMany: vi.fn(),
    createMany: vi.fn()
  },
  adminAuditLog: {
    create: vi.fn()
  }
}));

const txMock = vi.hoisted(() => ({
  newsArticle: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  newsCategory: {
    upsert: vi.fn()
  },
  newsTag: {
    upsert: vi.fn()
  },
  newsArticleTag: {
    deleteMany: vi.fn(),
    createMany: vi.fn()
  },
  newsExternalSource: {
    deleteMany: vi.fn(),
    createMany: vi.fn()
  },
  adminAuditLog: {
    create: vi.fn()
  }
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import {
  aiNewsImportPayloadSchema,
  buildAiNewsImportData,
  importAiNewsArticle,
  rejectUnsafeNewsImportContent,
  verifyAiNewsImportToken
} from "@/lib/ai-news-import";

const baseImportPayload = {
  publishMode: "draft" as const,
  importBatchId: "batch-42",
  article: {
    title: "!!!",
    summary: "AI agent deployments are increasing.",
    content: "## Facts\n\nBody copy",
    tags: ["Agents", "AI Deployment"],
    externalSources: [
      {
        title: "Official notice",
        url: "https://www.cac.gov.cn/2026-05/08/c_1779979789523320.htm",
        sourceType: "official_announcement"
      },
      {
        title: "Industry report",
        url: "https://example.com/report",
        sourceType: "authority_media",
        description: "Supporting case"
      }
    ]
  }
};

beforeEach(() => {
  vi.clearAllMocks();

  prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock));
  txMock.newsArticle.findFirst.mockResolvedValue(null);
  txMock.newsCategory.upsert.mockResolvedValue({
    id: "category-1",
    name: "AI快讯",
    slug: "ai-news-flash"
  });
  txMock.newsArticle.create.mockImplementation(async ({ data }) => ({
    id: "article-1",
    ...data
  }));
  txMock.newsTag.upsert.mockImplementation(async ({ create }) => ({
    id: `tag-${create.slug}`,
    ...create
  }));
  txMock.newsArticleTag.deleteMany.mockResolvedValue({ count: 0 });
  txMock.newsArticleTag.createMany.mockResolvedValue({ count: 0 });
  txMock.newsExternalSource.deleteMany.mockResolvedValue({ count: 0 });
  txMock.newsExternalSource.createMany.mockResolvedValue({ count: 0 });
  txMock.adminAuditLog.create.mockResolvedValue({ id: "audit-1" });
});

describe("AI news import helpers", () => {
  it("verifies bearer tokens without accepting missing or wrong values", () => {
    expect(verifyAiNewsImportToken("Bearer secret-token", "secret-token")).toBe(true);
    expect(verifyAiNewsImportToken("Bearer wrong", "secret-token")).toBe(false);
    expect(verifyAiNewsImportToken(null, "secret-token")).toBe(false);
    expect(verifyAiNewsImportToken("secret-token", "secret-token")).toBe(false);
    expect(verifyAiNewsImportToken("Bearer secret-token", "")).toBe(false);
    expect(verifyAiNewsImportToken("Bearer secret-token", undefined)).toBe(false);
  });

  it("rejects unsafe raw HTML and script-like content", () => {
    expect(() => rejectUnsafeNewsImportContent("## Body\n\nPlain paragraph")).not.toThrow();
    expect(() => rejectUnsafeNewsImportContent("<!doctype html><html><body>x</body></html>")).toThrow("raw HTML");
    expect(() => rejectUnsafeNewsImportContent("<script>alert(1)</script>")).toThrow("script");
    expect(() => rejectUnsafeNewsImportContent("<style>body{}</style>")).toThrow("style");
    expect(() => rejectUnsafeNewsImportContent('<p onclick="alert(1)">x</p>')).toThrow("event handler");
  });

  it("validates the required import payload shape", () => {
    const parsed = aiNewsImportPayloadSchema.parse({
      publishMode: "draft",
      importBatchId: "batch-1",
      article: {
        title: "China agent deployment accelerates",
        summary: "More AI agent applications are shipping.",
        content: "## Facts\n\nBody copy",
        externalSources: [
          {
            title: "Official source",
            url: "https://www.cac.gov.cn/2026-05/08/c_1779979789523320.htm",
            sourceType: "official_announcement"
          }
        ]
      }
    });

    expect(parsed.publishMode).toBe("draft");
    expect(parsed.article.externalSources).toHaveLength(1);
  });

  it("accepts Date publishedAt values produced by HTML imports", () => {
    const publishedAt = new Date("2026-06-18T08:00:00.000Z");
    const parsed = aiNewsImportPayloadSchema.parse({
      ...baseImportPayload,
      publishMode: "published",
      publishedAt
    });

    expect(parsed.publishedAt).toEqual(publishedAt);
  });

  it("builds import data without removed source metadata columns", () => {
    const data = buildAiNewsImportData(aiNewsImportPayloadSchema.parse(baseImportPayload), new Date("2026-06-18T08:00:00.000Z"));

    expect(data.category).toEqual({ name: "AI快讯", slug: "ai-news-flash" });
    expect(data.article).toMatchObject({
      status: "draft",
      publishedAt: null
    });
    expect(data.article).not.toHaveProperty("sourceChannel");
    expect(data.article).not.toHaveProperty("importedAt");
    expect(data.article).not.toHaveProperty("importBatchId");
    expect(data.article).not.toHaveProperty("rawImportPayload");
  });

  it("imports draft news into article, tags, sources, and audit log in a transaction", async () => {
    const result = await importAiNewsArticle(baseImportPayload);

    expect(result).toEqual({
      articleId: "article-1",
      slug: "news-batch-42",
      canonicalSlug: "news-batch-42",
      status: "draft",
      adminUrl: "/admin/ai-news/article-1",
      publicUrl: null
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.newsCategory.upsert).toHaveBeenCalledWith({
      where: { slug: "ai-news-flash" },
      update: { status: "active" },
      create: { name: "AI快讯", slug: "ai-news-flash", status: "active" }
    });

    const articleData = txMock.newsArticle.create.mock.calls[0][0].data;
    expect(articleData).toMatchObject({
      title: "!!!",
      slug: "news-batch-42",
      status: "draft",
      publishedAt: null,
      categoryId: "category-1"
    });
    expect(articleData).not.toHaveProperty("sourceChannel");
    expect(articleData).not.toHaveProperty("rawImportPayload");
    expect(txMock.newsTag.upsert).toHaveBeenCalledTimes(2);
    expect(txMock.newsArticleTag.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(txMock.newsExternalSource.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(txMock.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: null,
        action: "news_article.auto_import",
        targetType: "news_article",
        targetId: "article-1",
        summary: "Auto-imported AI news article.",
        metadata: {
          title: "!!!",
          slug: "news-batch-42",
          canonicalSlug: "news-batch-42",
          status: "draft",
          importBatchId: "batch-42",
          sourceChannel: "ai_auto_import",
          sourceCount: 2,
          tagCount: 2
        },
        ip: null,
        userAgent: null
      }
    });
  });

  it("rejects imported AI news when the cover image is already used by another article", async () => {
    txMock.newsArticle.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing-article", title: "Existing story" });

    await expect(
      importAiNewsArticle({
        ...baseImportPayload,
        article: {
          ...baseImportPayload.article,
          title: "Different AI news story",
          coverImage: "https://images.unsplash.com/photo-reused-cover"
        }
      })
    ).rejects.toThrow("AI news cover image is already used");

    expect(txMock.newsArticle.create).not.toHaveBeenCalled();
  });

  it("deduplicates imported tags by normalized slug before creating tag records", async () => {
    await expect(
      importAiNewsArticle({
        ...baseImportPayload,
        article: {
          ...baseImportPayload.article,
          tags: ["AI Agent", "AI-Agent"]
        }
      })
    ).resolves.toMatchObject({
      articleId: "article-1",
      status: "draft"
    });

    expect(txMock.newsTag.upsert).toHaveBeenCalledTimes(1);
    expect(txMock.newsArticleTag.createMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it("uses a deterministic slug suffix when the base slug already exists", async () => {
    txMock.newsArticle.findFirst.mockResolvedValueOnce({ id: "existing-article" }).mockResolvedValueOnce(null);

    const result = await importAiNewsArticle({
      ...baseImportPayload,
      article: {
        ...baseImportPayload.article,
        title: "OpenAI Agent Update"
      }
    });

    expect(result.slug).toBe("openai-agent-update-2");
    expect(txMock.newsArticle.create.mock.calls[0][0].data.slug).toBe("openai-agent-update-2");
  });

  it("imports published news with non-null publishedAt and a canonical public URL", async () => {
    txMock.newsArticle.create.mockImplementationOnce(async ({ data }) => ({
      id: "article-published",
      ...data
    }));

    const result = await importAiNewsArticle({
      ...baseImportPayload,
      publishMode: "published",
      publishedAt: "2026-06-18T08:00:00.000Z",
      importBatchId: "batch-published",
      article: {
        ...baseImportPayload.article,
        title: "OpenAI Agent Update",
        englishTitle: "OpenAI Agent Workflow Update",
        summary: "OpenAI released an agent workflow update."
      }
    });

    const articleData = txMock.newsArticle.create.mock.calls[0][0].data;
    expect(articleData).toMatchObject({
      slug: "openai-agent-update",
      status: "published"
    });
    expect(articleData.publishedAt).toEqual(new Date("2026-06-18T08:00:00.000Z"));
    expect(result).toEqual({
      articleId: "article-published",
      slug: "openai-agent-update",
      canonicalSlug: "openai-agent-update",
      status: "published",
      adminUrl: "/admin/ai-news/article-published",
      publicUrl: "/ai-news/openai-agent-update"
    });
  });
});
