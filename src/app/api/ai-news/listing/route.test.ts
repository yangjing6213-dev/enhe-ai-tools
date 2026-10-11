import { beforeEach, describe, expect, it, vi } from "vitest";

const publicContent = vi.hoisted(() => ({ getPublicNewsListing: vi.fn() }));
vi.mock("@/lib/public-content", () => publicContent);

import { GET } from "./route";

const article = {
  id: "news-one", slug: "news-one", title: "新闻一", summary: "摘要", englishTitle: "News one", englishSummary: "Summary",
  description: null, englishDescription: null, coverImage: null, isPinned: false,
  publishedAt: new Date("2026-10-11T00:00:00Z"), createdAt: new Date("2026-10-11T00:00:00Z"),
  readingTime: 3, viewCount: 4, category: { name: "AI News" }, externalSources: [{ id: "source" }], tagLinks: [],
  content: "private-to-render body", status: "published", authorId: "not-needed-by-client",
};

describe("public AI news pagination API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publicContent.getPublicNewsListing.mockResolvedValue({ articles: [article], total: 20 });
  });

  it("preserves filters, language and server paging while exposing only card fields", async () => {
    const response = await GET(new Request("https://example.test/api/ai-news/listing?page=2&locale=en&q=agent&category=category-a&tag=tag-a&sort=hot"));
    expect(response.status).toBe(200);
    expect(publicContent.getPublicNewsListing).toHaveBeenCalledWith(expect.objectContaining({ page: 2, skip: 9, pageSize: 9, locale: "en", q: "agent", category: "category-a", tag: "tag-a", sort: "hot" }));
    const result = await response.json();
    expect(result).toMatchObject({ page: 2, pageCount: 3, articles: [{ id: "news-one", href: "/en/ai-news/news-one", title: "News one" }] });
    expect(result.articles[0]).not.toHaveProperty("content");
    expect(result.articles[0]).not.toHaveProperty("authorId");
  });

  it.each(["0", "-1", "2invalid", String(Number.MAX_SAFE_INTEGER)])("rejects invalid page %s before reading the database", async (page) => {
    const response = await GET(new Request(`https://example.test/api/ai-news/listing?page=${page}`));
    expect(response.status).toBe(400);
    expect(publicContent.getPublicNewsListing).not.toHaveBeenCalled();
  });

  it("rejects unknown languages and oversized searches before a public read", async () => {
    expect((await GET(new Request("https://example.test/api/ai-news/listing?locale=invalid"))).status).toBe(400);
    expect((await GET(new Request(`https://example.test/api/ai-news/listing?q=${"x".repeat(201)}`))).status).toBe(400);
    expect(publicContent.getPublicNewsListing).not.toHaveBeenCalled();
  });

  it("returns a missing-page response for pages past the filtered result count", async () => {
    publicContent.getPublicNewsListing.mockResolvedValue({ articles: [], total: 2 });
    const response = await GET(new Request("https://example.test/api/ai-news/listing?page=2"));
    expect(response.status).toBe(404);
  });

  it.each(["q", "category", "tag", "sort", "page", "locale"])("rejects duplicate %s parameters instead of validating a different value from the consumed value", async (key) => {
    const response = await GET(new Request(`https://example.test/api/ai-news/listing?${key}=1&${key}=${"x".repeat(201)}`));
    expect(response.status).toBe(400);
    expect(publicContent.getPublicNewsListing).not.toHaveBeenCalled();
  });

  it("reports each language's filtered page count for safe language switches", async () => {
    publicContent.getPublicNewsListing.mockImplementation(async ({ locale }: { locale: string }) => ({ articles: [article], total: locale === "en" ? 2 : 20 }));
    const response = await GET(new Request("https://example.test/api/ai-news/listing?page=2&locale=zh"));
    expect(await response.json()).toMatchObject({ page: 2, pageCount: 3, languagePageCounts: { zh: 3, en: 1 } });
  });
});
