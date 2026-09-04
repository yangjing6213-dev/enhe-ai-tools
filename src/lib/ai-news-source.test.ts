import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function exists(path: string) {
  return existsSync(join(process.cwd(), path));
}

describe("AI news source contracts", () => {
  it("adds localized public and admin AI news routes", () => {
    expect(exists("src/app/ai-news/page-shell.tsx")).toBe(true);
    expect(exists("src/app/ai-news/[slug]/page-shell.tsx")).toBe(true);
    expect(exists("src/app/(zh-public)/ai-news/page.tsx")).toBe(true);
    expect(exists("src/app/(zh-public)/ai-news/[slug]/page.tsx")).toBe(true);
    expect(exists("src/app/en/ai-news/page.tsx")).toBe(true);
    expect(exists("src/app/en/ai-news/[slug]/page.tsx")).toBe(true);
    expect(exists("src/app/admin/ai-news/page.tsx")).toBe(true);
    expect(exists("src/app/admin/ai-news/[id]/page.tsx")).toBe(true);
  });

  it("exposes AI news navigation in public and admin chrome", () => {
    const dictionaries = read("src/lib/dictionaries.ts");
    const header = read("src/components/site-header.tsx");
    const adminLayout = read("src/app/admin/layout.tsx");
    const adminI18n = read("src/lib/admin-i18n.ts");

    expect(dictionaries).toContain("aiNews");
    expect(dictionaries).toContain("AI前沿资讯");
    expect(dictionaries).toContain("AI News");
    expect(header).toContain('buildLocalePath("/ai-news", locale)');
    expect(adminLayout).toContain('["aiNews", "/admin/ai-news"]');
    expect(adminI18n).toContain("aiNews");
  });

  it("adds AI news to localized SEO, public cache, and sitemap source", () => {
    const seo = read("src/lib/seo.ts");
    const publicContent = read("src/lib/public-content.ts");
    const sitemap = read("src/app/sitemap.ts");

    expect(seo).toContain("/^\\/ai-news$/");
    expect(seo).toContain("/^\\/ai-news\\/.+$/");
    expect(publicContent).toContain("getPublicNewsListing");
    expect(publicContent).toContain("getPublicNewsArticleBySlug");
    expect(sitemap).toContain('"/ai-news"');
    expect(sitemap).toContain('"/en/ai-news"');
    expect(sitemap).toContain("newsArticle");
  });

  it("routes english AI news pages through shared localization helpers for visible labels and schema keywords", () => {
    const listing = read("src/app/ai-news/page-shell.tsx");
    const detail = read("src/app/ai-news/[slug]/page-shell.tsx");

    expect(listing).toContain('from "@/lib/ai-news-localization"');
    expect(listing).toContain("resolveLocalizedNewsCategoryName");
    expect(listing).toContain("resolveLocalizedNewsTagName");
    expect(listing).toContain("buildLocalizedNewsSummary");

    expect(detail).toContain('from "@/lib/ai-news-localization"');
    expect(detail).toContain("resolveLocalizedNewsCategoryName");
    expect(detail).toContain("resolveLocalizedNewsTagName");
    expect(detail).toContain("buildLocalizedNewsKeywordList");
    expect(detail).toContain("buildLocalizedTutorialPreviewTitle");
    expect(detail).toContain("buildLocalizedTutorialPreviewToolName");
  });

  it("uses sanitized AI news descriptions for metadata and structured data", () => {
    const detail = read("src/app/ai-news/[slug]/page-shell.tsx");

    expect(detail).toContain("resolveAiNewsMetaDescription");
    expect(detail).toContain("description: localized.description");
    expect(detail).not.toContain("description: localized.description || localized.summary");
  });

  it("adds Prisma news models and interaction APIs", () => {
    const schema = read("prisma/schema.prisma");

    expect(schema).toContain("enum NewsStatus");
    expect(schema).toContain("model NewsArticle");
    expect(schema).toContain("model NewsCategory");
    expect(schema).toContain("model NewsTag");
    expect(schema).toContain("model NewsExternalSource");
    expect(schema).toContain("model NewsArticleFavorite");
    expect(schema).toContain("model NewsArticleLike");
    expect(exists("src/app/api/ai-news/[slug]/view/route.ts")).toBe(true);
    expect(exists("src/app/api/ai-news/[slug]/like/route.ts")).toBe(true);
    expect(exists("src/app/api/ai-news/[slug]/favorite/route.ts")).toBe(true);
  });

  it("adds a production-safe AI news seed script", () => {
    expect(exists("prisma/seed-ai-news.ts")).toBe(true);
    expect(exists("prisma/seed-ai-news.cjs")).toBe(true);

    const seed = read("prisma/seed-ai-news.ts");
    const containerSeed = read("prisma/seed-ai-news.cjs");
    expect(seed).toContain("newsArticle.upsert");
    expect(seed).toContain("newsCategory.upsert");
    expect(containerSeed).toContain("newsArticle.upsert");
    expect(containerSeed).toContain("newsCategory.upsert");
    expect(seed).not.toContain("user.upsert");
    expect(seed).not.toContain("siteSetting.upsert");
    expect(containerSeed).not.toContain("user.upsert");
    expect(containerSeed).not.toContain("siteSetting.upsert");
  });

  it("allows admins to delete AI news articles from the list page", () => {
    const actions = read("src/app/admin/actions.ts");
    const adminList = read("src/app/admin/ai-news/page.tsx");

    expect(actions).toContain("export async function deleteNewsArticleAction");
    expect(actions).toContain('action: "news_article.delete"');
    expect(actions).toContain('redirect("/admin/ai-news?deleted=1")');
    expect(adminList).toContain("deleteNewsArticleAction");
    expect(adminList).toContain('action={deleteNewsArticleAction}');
    expect(adminList).toContain('name="id" value={article.id}');
  });

  it("selects englishTitle when deleting AI news articles so canonical revalidation can resolve localized slugs", () => {
    const actions = read("src/app/admin/actions.ts");

    expect(actions).toContain("const deletedCanonicalNewsSlug = resolveAiNewsCanonicalSlug({");
    expect(actions).toContain("select: { id: true, title: true, englishTitle: true, slug: true, status: true }");
  });
});
