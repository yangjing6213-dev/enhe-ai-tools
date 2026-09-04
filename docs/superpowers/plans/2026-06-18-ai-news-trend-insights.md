# AI News Trend Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional AI news and trend insights module for ENHE AI Tools with public Chinese and English pages, admin management, Prisma-backed content, SEO metadata, JSON-LD, sitemap coverage, and basic article interactions.

**Architecture:** Add a dedicated Prisma-backed news domain while reusing the existing Next.js App Router, public chrome, admin Server Action pattern, SEO helpers, and dark glass UI. Keep public pages read-only and cached, admin writes protected by `requireAdmin`, and user interactions isolated in small API routes and client leaf components.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma/PostgreSQL, Tailwind CSS v4, Vitest, Playwright, existing deployment script for GitHub and Tencent Cloud.

---

## File Structure

### Create

- `src/lib/ai-news.ts`: news domain helpers, safe markdown-like renderer, table-of-contents extraction, English indexability guard, query parsing, and related content helpers.
- `src/lib/ai-news-source.test.ts`: source contract tests for routes, navigation, sitemap, and SEO integration.
- `src/lib/ai-news.test.ts`: behavior tests for renderer, localization guard, query parsing, and relation parsing.
- `src/app/ai-news/page-shell.tsx`: shared public list page implementation.
- `src/app/ai-news/[slug]/page-shell.tsx`: shared public detail page implementation.
- `src/app/(zh-public)/ai-news/page.tsx`: Chinese list route wrapper.
- `src/app/(zh-public)/ai-news/[slug]/page.tsx`: Chinese detail route wrapper.
- `src/app/en/ai-news/page.tsx`: English list route wrapper.
- `src/app/en/ai-news/[slug]/page.tsx`: English detail route wrapper.
- `src/components/ai-news-interactions.tsx`: client-only like/favorite/share/copy/back-to-top controls.
- `src/app/api/ai-news/[slug]/view/route.ts`: view-count API.
- `src/app/api/ai-news/[slug]/like/route.ts`: like API.
- `src/app/api/ai-news/[slug]/favorite/route.ts`: favorite API.
- `src/app/admin/ai-news/page.tsx`: admin list page.
- `src/app/admin/ai-news/[id]/page.tsx`: admin editor page.
- `src/app/admin/ai-news-editor.tsx`: reusable admin editor/list components if page size becomes too large.
- `prisma/migrations/20260618120000_add_ai_news_module/migration.sql`: database migration.

### Modify

- `prisma/schema.prisma`: add news enums, models, relations to `User`, `Tool`, and `Tutorial` where needed.
- `src/app/admin/actions.ts`: add admin create/update/archive/delete actions for news articles, categories, tags, and sources.
- `src/app/admin/layout.tsx`: add admin navigation link.
- `src/lib/admin-i18n.ts`: add admin navigation labels.
- `src/lib/dictionaries.ts`: add public nav and AI news public strings.
- `src/components/site-header.tsx`: add AI news to primary and mobile nav.
- `src/lib/seo.ts`: include `/ai-news` in localized route recognition and add NewsArticle schema helper if useful.
- `src/lib/public-content.ts`: add cached public news queries.
- `src/app/sitemap.ts`: include list pages and published news detail pages.
- `src/lib/public-routes.ts`: reuse public cache seconds.

---

## Task 1: Add Source Contract Tests First

**Files:**
- Create: `src/lib/ai-news-source.test.ts`
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Write the failing source contract test**

```ts
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
    expect(dictionaries).toContain("AI资讯");
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- src/lib/ai-news-source.test.ts
```

Expected: FAIL because route files, Prisma models, and helpers do not exist yet.

- [ ] **Step 3: Commit only if the test file is correct**

Do not commit yet if the test errors because of syntax. Fix syntax and re-run until it fails for missing implementation.

---

## Task 2: Add Domain Behavior Tests

**Files:**
- Create: `src/lib/ai-news.test.ts`
- Create later: `src/lib/ai-news.ts`
- Test: `src/lib/ai-news.test.ts`

- [ ] **Step 1: Write failing behavior tests**

```ts
import { describe, expect, it } from "vitest";
import {
  extractNewsTableOfContents,
  isEnglishNewsArticleIndexable,
  parseNewsRelationIds,
  parseNewsSearchParams,
  renderNewsContentBlocks,
  resolveNewsSlug
} from "@/lib/ai-news";

describe("AI news helpers", () => {
  it("resolves clean slugs with a stable fallback", () => {
    expect(resolveNewsSlug({ title: "OpenAI Agent Update", slugInput: "", fallbackSeed: "abc" })).toBe("openai-agent-update");
    expect(resolveNewsSlug({ title: "中文标题", slugInput: "", fallbackSeed: "abc" })).toBe("news-abc");
    expect(resolveNewsSlug({ title: "Ignored", slugInput: "AI 视频 2026", fallbackSeed: "abc" })).toBe("ai-2026");
  });

  it("parses search params with safe defaults", () => {
    expect(parseNewsSearchParams({ q: "  agent ", page: "3", sort: "hot", category: "cat", tag: "tag" })).toEqual({
      q: "agent",
      page: 3,
      pageSize: 9,
      skip: 18,
      sort: "hot",
      category: "cat",
      tag: "tag"
    });
    expect(parseNewsSearchParams({ page: "-2", sort: "unknown" })).toMatchObject({
      page: 1,
      skip: 0,
      sort: "latest"
    });
  });

  it("extracts H2 and H3 headings for a table of contents", () => {
    const toc = extractNewsTableOfContents("## 发生了什么？\n正文\n### 对普通用户\n## 总结");
    expect(toc).toEqual([
      { id: "section-1", level: 2, title: "发生了什么？" },
      { id: "section-2", level: 3, title: "对普通用户" },
      { id: "section-3", level: 2, title: "总结" }
    ]);
  });

  it("renders safe content blocks and escapes raw html", () => {
    const blocks = renderNewsContentBlocks("## 标题\n<script>alert(1)</script>\n- 要点\n> 引用");
    expect(blocks).toEqual([
      { type: "heading", level: 2, id: "section-1", text: "标题" },
      { type: "paragraph", text: "&lt;script&gt;alert(1)&lt;/script&gt;" },
      { type: "list", ordered: false, items: ["要点"] },
      { type: "quote", text: "引用" }
    ]);
  });

  it("guards English indexing when translated content is too thin", () => {
    expect(isEnglishNewsArticleIndexable({ englishTitle: "AI news", englishSummary: "Short", englishContent: "Tiny" })).toBe(false);
    expect(
      isEnglishNewsArticleIndexable({
        englishTitle: "OpenAI releases a practical agent update",
        englishSummary: "A concise summary for English readers.",
        englishContent: "This update matters because it changes how teams can connect model capabilities with everyday workflows. ".repeat(3)
      })
    ).toBe(true);
  });

  it("parses relation ids from comma and newline separated fields", () => {
    expect(parseNewsRelationIds("a, b\nc，a")).toEqual(["a", "b", "c"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- src/lib/ai-news.test.ts
```

Expected: FAIL because `src/lib/ai-news.ts` does not exist.

---

## Task 3: Implement Core Domain Helpers

**Files:**
- Create: `src/lib/ai-news.ts`
- Test: `src/lib/ai-news.test.ts`

- [ ] **Step 1: Add minimal helper implementation**

Create `src/lib/ai-news.ts`:

```ts
import { slugify } from "@/lib/admin-form";

export type NewsSort = "latest" | "hot" | "featured";

export type NewsSearchFilters = {
  q?: string;
  category?: string;
  tag?: string;
  sort: NewsSort;
  page: number;
  pageSize: number;
  skip: number;
};

export type NewsTocItem = {
  id: string;
  level: 2 | 3;
  title: string;
};

export type NewsContentBlock =
  | { type: "heading"; level: 2 | 3; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; language?: string; code: string };

const newsPageSize = 9;

export function resolveNewsSlug({
  title,
  slugInput,
  fallbackSeed
}: {
  title: string;
  slugInput?: string | null;
  fallbackSeed: string;
}) {
  const manualSlug = slugInput ? slugify(slugInput) : "";
  if (manualSlug) return manualSlug;
  const titleSlug = slugify(title);
  if (titleSlug) return titleSlug;
  return `news-${slugify(fallbackSeed) || "item"}`;
}

function normalizeStringParam(value: string | undefined) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

export function parseNewsSearchParams(params: Record<string, string | undefined>): NewsSearchFilters {
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const sort = params.sort === "hot" || params.sort === "featured" ? params.sort : "latest";

  return {
    q: normalizeStringParam(params.q),
    category: normalizeStringParam(params.category),
    tag: normalizeStringParam(params.tag),
    sort,
    page,
    pageSize: newsPageSize,
    skip: (page - 1) * newsPageSize
  };
}

export function escapeNewsText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHeadingPrefix(line: string) {
  return line.replace(/^#{2,3}\s+/, "").trim();
}

export function extractNewsTableOfContents(content: string): NewsTocItem[] {
  let count = 0;
  return content
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(##|###)\s+(.+)$/);
      if (!match) return null;
      count += 1;
      return {
        id: `section-${count}`,
        level: match[1] === "###" ? 3 : 2,
        title: stripHeadingPrefix(line)
      } satisfies NewsTocItem;
    })
    .filter((item): item is NewsTocItem => Boolean(item));
}

function pushParagraph(lines: string[], blocks: NewsContentBlock[]) {
  const text = lines.join(" ").trim();
  if (text) blocks.push({ type: "paragraph", text: escapeNewsText(text) });
  lines.length = 0;
}

function pushList(items: string[], ordered: boolean, blocks: NewsContentBlock[]) {
  if (!items.length) return;
  blocks.push({ type: "list", ordered, items: items.map(escapeNewsText) });
  items.length = 0;
}

export function renderNewsContentBlocks(content: string): NewsContentBlock[] {
  const blocks: NewsContentBlock[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];
  let currentListOrdered = false;
  let headingCount = 0;
  let inCode = false;
  let codeLanguage = "";
  const codeLines: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const codeFence = line.match(/^```(.*)$/);
    if (codeFence) {
      if (inCode) {
        blocks.push({ type: "code", language: codeLanguage || undefined, code: codeLines.join("\n") });
        codeLines.length = 0;
        codeLanguage = "";
        inCode = false;
      } else {
        pushParagraph(paragraphLines, blocks);
        pushList(listItems, currentListOrdered, blocks);
        codeLanguage = codeFence[1].trim();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      pushParagraph(paragraphLines, blocks);
      pushList(listItems, currentListOrdered, blocks);
      continue;
    }

    const heading = line.match(/^(##|###)\s+(.+)$/);
    if (heading) {
      pushParagraph(paragraphLines, blocks);
      pushList(listItems, currentListOrdered, blocks);
      headingCount += 1;
      blocks.push({
        type: "heading",
        level: heading[1] === "###" ? 3 : 2,
        id: `section-${headingCount}`,
        text: escapeNewsText(stripHeadingPrefix(line))
      });
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      pushParagraph(paragraphLines, blocks);
      const nextOrdered = Boolean(ordered);
      if (listItems.length && currentListOrdered !== nextOrdered) {
        pushList(listItems, currentListOrdered, blocks);
      }
      currentListOrdered = nextOrdered;
      listItems.push((unordered?.[1] ?? ordered?.[1] ?? "").trim());
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      pushParagraph(paragraphLines, blocks);
      pushList(listItems, currentListOrdered, blocks);
      blocks.push({ type: "quote", text: escapeNewsText(quote[1]) });
      continue;
    }

    pushList(listItems, currentListOrdered, blocks);
    paragraphLines.push(line.trim());
  }

  if (inCode) {
    blocks.push({ type: "code", language: codeLanguage || undefined, code: codeLines.join("\n") });
  }
  pushParagraph(paragraphLines, blocks);
  pushList(listItems, currentListOrdered, blocks);

  return blocks;
}

export function isEnglishNewsArticleIndexable(article: {
  englishTitle?: string | null;
  englishSummary?: string | null;
  englishContent?: string | null;
}) {
  const title = String(article.englishTitle ?? "").trim();
  const summary = String(article.englishSummary ?? "").trim();
  const content = String(article.englishContent ?? "").replace(/\s+/g, " ").trim();

  return title.length >= 12 && summary.length >= 24 && content.length >= 180;
}

export function parseNewsRelationIds(value: string | null | undefined) {
  const seen = new Set<string>();
  return String(value ?? "")
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}
```

- [ ] **Step 2: Run behavior tests**

Run:

```powershell
npm test -- src/lib/ai-news.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add -- src/lib/ai-news.ts src/lib/ai-news.test.ts src/lib/ai-news-source.test.ts
git commit -m "Add AI news domain tests and helpers"
```

---

## Task 4: Add Prisma Models And Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260618120000_add_ai_news_module/migration.sql`
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Add Prisma enum and model definitions**

Append these schema pieces in `prisma/schema.prisma`, keeping enum and model style consistent:

```prisma
enum NewsStatus {
  draft
  published
  archived
}

model NewsCategory {
  id          String        @id @default(cuid())
  name        String
  slug        String        @unique
  description String?
  status      ContentStatus @default(active)
  sortOrder   Int           @default(0) @map("sort_order")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  articles    NewsArticle[]

  @@index([status, sortOrder])
  @@map("news_categories")
}

model NewsTag {
  id           String           @id @default(cuid())
  name         String           @unique
  slug         String           @unique
  description  String?
  status       ContentStatus    @default(active)
  sortOrder    Int              @default(0) @map("sort_order")
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")
  articleLinks NewsArticleTag[]

  @@index([status, sortOrder])
  @@map("news_tags")
}

model NewsArticle {
  id                    String               @id @default(cuid())
  title                 String
  slug                  String               @unique
  subtitle              String?
  description           String?
  keywords              String?
  summary               String
  content               String
  coverImage            String?              @map("cover_image")
  videoUrl              String?              @map("video_url")
  videoTitle            String?              @map("video_title")
  videoDescription      String?              @map("video_description")
  author                String?
  status                NewsStatus           @default(draft)
  categoryId            String?              @map("category_id")
  publishedAt           DateTime?            @map("published_at")
  readingTime           Int                  @default(5) @map("reading_time")
  viewCount             Int                  @default(0) @map("view_count")
  likeCount             Int                  @default(0) @map("like_count")
  favoriteCount         Int                  @default(0) @map("favorite_count")
  isFeatured            Boolean              @default(false) @map("is_featured")
  isPinned              Boolean              @default(false) @map("is_pinned")
  sortOrder             Int                  @default(0) @map("sort_order")
  seoTitle              String?              @map("seo_title")
  seoDescription        String?              @map("seo_description")
  seoKeywords           String?              @map("seo_keywords")
  canonicalUrl          String?              @map("canonical_url")
  keyTakeaways          String[]             @default([]) @map("key_takeaways")
  impactNotes           String?              @map("impact_notes")
  conclusion            String?
  relatedArticleIds     String[]             @default([]) @map("related_article_ids")
  relatedToolIds        String[]             @default([]) @map("related_tool_ids")
  relatedTutorialIds    String[]             @default([]) @map("related_tutorial_ids")
  englishTitle          String?              @map("english_title")
  englishSubtitle       String?              @map("english_subtitle")
  englishDescription    String?              @map("english_description")
  englishSummary        String?              @map("english_summary")
  englishContent        String?              @map("english_content")
  englishKeywords       String?              @map("english_keywords")
  englishSeoTitle       String?              @map("english_seo_title")
  englishSeoDescription String?              @map("english_seo_description")
  englishSeoKeywords    String?              @map("english_seo_keywords")
  englishKeyTakeaways   String[]             @default([]) @map("english_key_takeaways")
  englishImpactNotes    String?              @map("english_impact_notes")
  englishConclusion     String?              @map("english_conclusion")
  createdAt             DateTime             @default(now()) @map("created_at")
  updatedAt             DateTime             @updatedAt @map("updated_at")
  category              NewsCategory?        @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  tagLinks              NewsArticleTag[]
  externalSources       NewsExternalSource[]
  favorites             NewsArticleFavorite[]
  likes                 NewsArticleLike[]

  @@index([status, publishedAt])
  @@index([categoryId, status])
  @@index([isFeatured, isPinned, sortOrder])
  @@map("news_articles")
}

model NewsArticleTag {
  id        String      @id @default(cuid())
  articleId String      @map("article_id")
  tagId     String      @map("tag_id")
  article   NewsArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  tag       NewsTag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([articleId, tagId])
  @@map("news_article_tags")
}

model NewsExternalSource {
  id          String      @id @default(cuid())
  articleId   String      @map("article_id")
  title       String
  url         String
  sourceType  String      @map("source_type")
  description String?
  sortOrder   Int         @default(0) @map("sort_order")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  article     NewsArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@index([articleId, sortOrder])
  @@map("news_external_sources")
}

model NewsArticleFavorite {
  id        String      @id @default(cuid())
  articleId String      @map("article_id")
  userId    String      @map("user_id")
  createdAt DateTime    @default(now()) @map("created_at")
  article   NewsArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([articleId, userId])
  @@index([userId, createdAt])
  @@map("news_article_favorites")
}

model NewsArticleLike {
  id        String      @id @default(cuid())
  articleId String      @map("article_id")
  userId    String      @map("user_id")
  createdAt DateTime    @default(now()) @map("created_at")
  article   NewsArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([articleId, userId])
  @@index([userId, createdAt])
  @@map("news_article_likes")
}
```

Also add these relations to `model User`:

```prisma
  newsFavorites    NewsArticleFavorite[]
  newsLikes        NewsArticleLike[]
```

- [ ] **Step 2: Create SQL migration**

Create `prisma/migrations/20260618120000_add_ai_news_module/migration.sql`:

```sql
CREATE TYPE "NewsStatus" AS ENUM ('draft', 'published', 'archived');

CREATE TABLE "news_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'active',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_tags" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'active',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_articles" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT,
  "keywords" TEXT,
  "summary" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "cover_image" TEXT,
  "video_url" TEXT,
  "video_title" TEXT,
  "video_description" TEXT,
  "author" TEXT,
  "status" "NewsStatus" NOT NULL DEFAULT 'draft',
  "category_id" TEXT,
  "published_at" TIMESTAMP(3),
  "reading_time" INTEGER NOT NULL DEFAULT 5,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "favorite_count" INTEGER NOT NULL DEFAULT 0,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "seo_keywords" TEXT,
  "canonical_url" TEXT,
  "key_takeaways" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "impact_notes" TEXT,
  "conclusion" TEXT,
  "related_article_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "related_tool_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "related_tutorial_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "english_title" TEXT,
  "english_subtitle" TEXT,
  "english_description" TEXT,
  "english_summary" TEXT,
  "english_content" TEXT,
  "english_keywords" TEXT,
  "english_seo_title" TEXT,
  "english_seo_description" TEXT,
  "english_seo_keywords" TEXT,
  "english_key_takeaways" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "english_impact_notes" TEXT,
  "english_conclusion" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_article_tags" (
  "id" TEXT NOT NULL,
  "article_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  CONSTRAINT "news_article_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_external_sources" (
  "id" TEXT NOT NULL,
  "article_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_external_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_article_favorites" (
  "id" TEXT NOT NULL,
  "article_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_article_favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_article_likes" (
  "id" TEXT NOT NULL,
  "article_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_article_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "news_categories_slug_key" ON "news_categories"("slug");
CREATE INDEX "news_categories_status_sort_order_idx" ON "news_categories"("status", "sort_order");
CREATE UNIQUE INDEX "news_tags_name_key" ON "news_tags"("name");
CREATE UNIQUE INDEX "news_tags_slug_key" ON "news_tags"("slug");
CREATE INDEX "news_tags_status_sort_order_idx" ON "news_tags"("status", "sort_order");
CREATE UNIQUE INDEX "news_articles_slug_key" ON "news_articles"("slug");
CREATE INDEX "news_articles_status_published_at_idx" ON "news_articles"("status", "published_at");
CREATE INDEX "news_articles_category_id_status_idx" ON "news_articles"("category_id", "status");
CREATE INDEX "news_articles_is_featured_is_pinned_sort_order_idx" ON "news_articles"("is_featured", "is_pinned", "sort_order");
CREATE UNIQUE INDEX "news_article_tags_article_id_tag_id_key" ON "news_article_tags"("article_id", "tag_id");
CREATE INDEX "news_external_sources_article_id_sort_order_idx" ON "news_external_sources"("article_id", "sort_order");
CREATE UNIQUE INDEX "news_article_favorites_article_id_user_id_key" ON "news_article_favorites"("article_id", "user_id");
CREATE INDEX "news_article_favorites_user_id_created_at_idx" ON "news_article_favorites"("user_id", "created_at");
CREATE UNIQUE INDEX "news_article_likes_article_id_user_id_key" ON "news_article_likes"("article_id", "user_id");
CREATE INDEX "news_article_likes_user_id_created_at_idx" ON "news_article_likes"("user_id", "created_at");

ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "news_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "news_article_tags" ADD CONSTRAINT "news_article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_article_tags" ADD CONSTRAINT "news_article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "news_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_external_sources" ADD CONSTRAINT "news_external_sources_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_article_favorites" ADD CONSTRAINT "news_article_favorites_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_article_favorites" ADD CONSTRAINT "news_article_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_article_likes" ADD CONSTRAINT "news_article_likes_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_article_likes" ADD CONSTRAINT "news_article_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Generate Prisma client**

Run:

```powershell
npm run prisma:generate
```

Expected: Prisma client generation succeeds.

- [ ] **Step 4: Run source contracts**

Run:

```powershell
npm test -- src/lib/ai-news-source.test.ts
```

Expected: still FAIL because routes and page helpers are not implemented, but Prisma model assertions now pass.

- [ ] **Step 5: Commit**

```powershell
git add -- prisma/schema.prisma prisma/migrations/20260618120000_add_ai_news_module/migration.sql package-lock.json src/lib/ai-news-source.test.ts
git commit -m "Add AI news database schema"
```

---

## Task 5: Add Public Dictionaries, Navigation, And SEO Route Recognition

**Files:**
- Modify: `src/lib/dictionaries.ts`
- Modify: `src/components/site-header.tsx`
- Modify: `src/lib/admin-i18n.ts`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/lib/seo.ts`
- Test: `src/lib/ai-news-source.test.ts`
- Test: `src/lib/site-header-nav.test.ts`

- [ ] **Step 1: Add dictionary keys**

Add `aiNews: "AI资讯"` to `dictionaries.zh.nav`, and `aiNews: "AI News"` to `dictionaries.en.nav`.

Add a new `aiNews` dictionary object under both locales:

```ts
aiNews: {
  title: "AI资讯与趋势洞察",
  intro: "关注 AI 工具、模型更新、行业趋势与实用教程，帮助你更快理解变化，把新技术变成真实生产力。",
  support: "不只看见趋势，更要学会使用趋势。",
  searchPlaceholder: "搜索标题、摘要、关键词或标签",
  allCategories: "全部分类",
  allTags: "全部标签",
  latest: "最新",
  hot: "热门",
  featured: "推荐",
  filter: "筛选资讯",
  featuredTitle: "今日重点",
  latestTitle: "最新资讯",
  trendTitle: "热门趋势榜",
  topicsTitle: "专题合集",
  keywordsTitle: "热门关键词",
  subscribeTitle: "订阅 AI 趋势更新",
  subscribeIntro: "不错过每一次工具升级与机会变化，把值得关注的 AI 信息留在你的工作流里。",
  readMore: "继续阅读",
  viewTool: "查看工具",
  viewDetails: "了解详情",
  maybeUseful: "看看适不适合我",
  relatedTools: "你可能会用到这些工具",
  relatedTutorials: "相关教程",
  relatedNews: "相关阅读",
  keyTakeaways: "本文核心看点",
  impactTitle: "这对普通用户意味着什么？",
  conclusion: "总结",
  sources: "参考来源",
  tableOfContents: "文章目录",
  emptyTitle: "暂无匹配资讯",
  emptyText: "可以调整筛选条件，或先从 AI 软件、账号服务和教程开始探索。",
  copyLink: "复制链接",
  share: "分享",
  like: "点赞",
  favorite: "收藏",
  backToTop: "返回顶部",
  loginRequired: "请先登录后再操作。"
}
```

English object:

```ts
aiNews: {
  title: "AI News And Trend Insights",
  intro: "Track AI tools, model updates, industry trends, and practical tutorials so you can turn new technology into real productivity.",
  support: "Do not just watch the trend. Learn how to use it.",
  searchPlaceholder: "Search title, summary, keywords, or tags",
  allCategories: "All categories",
  allTags: "All tags",
  latest: "Latest",
  hot: "Popular",
  featured: "Featured",
  filter: "Filter news",
  featuredTitle: "Today Focus",
  latestTitle: "Latest Insights",
  trendTitle: "Hot Trends",
  topicsTitle: "Topic Collections",
  keywordsTitle: "Popular Keywords",
  subscribeTitle: "Subscribe To AI Trend Updates",
  subscribeIntro: "Keep useful AI updates close to your workflow without missing tool upgrades or new opportunities.",
  readMore: "Continue reading",
  viewTool: "View tool",
  viewDetails: "Learn more",
  maybeUseful: "See if it fits me",
  relatedTools: "Tools you may use",
  relatedTutorials: "Related tutorials",
  relatedNews: "Related reading",
  keyTakeaways: "Key takeaways",
  impactTitle: "What this means for everyday users",
  conclusion: "Summary",
  sources: "Sources",
  tableOfContents: "Table of contents",
  emptyTitle: "No matching insights",
  emptyText: "Adjust the filters, or start with AI software, account services, and tutorials.",
  copyLink: "Copy link",
  share: "Share",
  like: "Like",
  favorite: "Save",
  backToTop: "Back to top",
  loginRequired: "Please log in first."
}
```

- [ ] **Step 2: Add public header link**

Modify `navItems` in `src/components/site-header.tsx`:

```ts
const navItems = [
  { label: t.nav.home, href: buildLocalePath("/", locale) },
  { label: t.nav.aiNews, href: buildLocalePath("/ai-news", locale) },
  { label: t.nav.software, href: buildLocalePath("/software", locale) },
  { label: t.nav.onlineTools, href: buildLocalePath("/online-tools", locale) },
  { label: t.nav.skillLearning, href: buildLocalePath("/skill-learning", locale) },
  { label: t.nav.updates, href: buildLocalePath("/#updates", locale) }
] as const;
```

- [ ] **Step 3: Add admin nav labels and link**

Add `aiNews` to admin dictionaries:

```ts
aiNews: "AI资讯"
```

and:

```ts
aiNews: "AI News"
```

Add this in `adminNav` after `skillLearning`:

```ts
["aiNews", "/admin/ai-news"],
```

- [ ] **Step 4: Add localized route recognition**

Modify `localizedPublicRoutePatterns` in `src/lib/seo.ts`:

```ts
/^\/ai-news$/,
/^\/ai-news\/.+$/,
```

- [ ] **Step 5: Update existing header nav test**

Modify `src/lib/site-header-nav.test.ts` so it expects `nav.aiNews` and keeps home first:

```ts
expect(source).toContain("nav.aiNews");
expect(source).toContain('href: buildLocalePath("/ai-news", locale)');
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm test -- src/lib/site-header-nav.test.ts src/lib/ai-news-source.test.ts
```

Expected: header nav test passes; AI news source test still fails for route and API files not yet created.

- [ ] **Step 7: Commit**

```powershell
git add -- src/lib/dictionaries.ts src/components/site-header.tsx src/lib/admin-i18n.ts src/app/admin/layout.tsx src/lib/seo.ts src/lib/site-header-nav.test.ts
git commit -m "Add AI news navigation and localized routes"
```

---

## Task 6: Add Cached Public News Queries

**Files:**
- Modify: `src/lib/public-content.ts`
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Add public news query helpers**

In `src/lib/public-content.ts`, add:

```ts
import type { Prisma } from "@prisma/client";
```

Add cached helpers:

```ts
export type PublicNewsListingFilters = {
  q?: string;
  category?: string;
  tag?: string;
  sort?: "latest" | "hot" | "featured";
  skip?: number;
  take?: number;
};

function buildNewsWhere(filters: PublicNewsListingFilters): Prisma.NewsArticleWhereInput {
  const keyword = filters.q?.trim();
  return {
    status: "published",
    ...(filters.category ? { categoryId: filters.category } : {}),
    ...(filters.tag ? { tagLinks: { some: { tag: { slug: filters.tag } } } } : {}),
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: "insensitive" } },
            { subtitle: { contains: keyword, mode: "insensitive" } },
            { summary: { contains: keyword, mode: "insensitive" } },
            { description: { contains: keyword, mode: "insensitive" } },
            { keywords: { contains: keyword, mode: "insensitive" } },
            { tagLinks: { some: { tag: { name: { contains: keyword, mode: "insensitive" } } } } }
          ]
        }
      : {})
  };
}

const getCachedPublicNewsListing = unstable_cache(
  async (filters: PublicNewsListingFilters) => {
    try {
      const where = buildNewsWhere(filters);
      const orderBy: Prisma.NewsArticleOrderByWithRelationInput[] =
        filters.sort === "hot"
          ? [{ viewCount: "desc" }, { publishedAt: "desc" }]
          : filters.sort === "featured"
            ? [{ isPinned: "desc" }, { isFeatured: "desc" }, { sortOrder: "asc" }, { publishedAt: "desc" }]
            : [{ isPinned: "desc" }, { publishedAt: "desc" }];
      const [articles, total] = await Promise.all([
        prisma.newsArticle.findMany({
          where,
          include: { category: true, tagLinks: { include: { tag: true } } },
          orderBy,
          skip: filters.skip ?? 0,
          take: filters.take ?? 9
        }),
        prisma.newsArticle.count({ where })
      ]);
      return { articles, total };
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return { articles: [], total: 0 };
      throw error;
    }
  },
  ["public-news-listing"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] }
);

const getCachedPublicNewsCategories = unstable_cache(
  async () => {
    try {
      return await prisma.newsCategory.findMany({ where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return [];
      throw error;
    }
  },
  ["public-news-categories"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] }
);

const getCachedPublicNewsTags = unstable_cache(
  async () => {
    try {
      return await prisma.newsTag.findMany({ where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return [];
      throw error;
    }
  },
  ["public-news-tags"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] }
);

const getCachedPublicNewsArticleBySlug = unstable_cache(
  async (slug: string) => {
    try {
      return await prisma.newsArticle.findFirst({
        where: { slug, status: "published" },
        include: {
          category: true,
          tagLinks: { include: { tag: true } },
          externalSources: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
        }
      });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return null;
      throw error;
    }
  },
  ["public-news-article-by-slug"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] }
);

export async function getPublicNewsListing(filters: PublicNewsListingFilters) {
  return getCachedPublicNewsListing(filters);
}

export async function getPublicNewsCategories() {
  return getCachedPublicNewsCategories();
}

export async function getPublicNewsTags() {
  return getCachedPublicNewsTags();
}

export async function getPublicNewsArticleBySlug(slug: string) {
  return getCachedPublicNewsArticleBySlug(slug);
}
```

- [ ] **Step 2: Run source test**

Run:

```powershell
npm test -- src/lib/ai-news-source.test.ts
```

Expected: public-content assertions pass; route/API assertions still fail.

- [ ] **Step 3: Commit**

```powershell
git add -- src/lib/public-content.ts
git commit -m "Add cached public AI news queries"
```

---

## Task 7: Add Public List Page

**Files:**
- Create: `src/app/ai-news/page-shell.tsx`
- Create: `src/app/(zh-public)/ai-news/page.tsx`
- Create: `src/app/en/ai-news/page.tsx`
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Create list page shell**

Implement `src/app/ai-news/page-shell.tsx` with:

- `generateAiNewsPageMetadata(forceLocale)`
- `AiNewsPageShell({ searchParams, forceLocale })`
- internal `NewsCard`, `FilterBar`, `TopicCollections`, and `KeywordCloud` components.

Essential code shape:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { Badge, ButtonLink, Container, EmptyState, SectionTitle } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { parseNewsSearchParams } from "@/lib/ai-news";
import { getPublicNewsCategories, getPublicNewsListing, getPublicNewsTags } from "@/lib/public-content";
import { publicPageCacheSeconds } from "@/lib/public-routes";
import { buildBreadcrumbSchema, buildLocalePath, buildMetadataTitle, buildPageMetadata } from "@/lib/seo";

export const aiNewsPageRevalidate = publicPageCacheSeconds;

export async function generateAiNewsPageMetadata(forceLocale: Locale): Promise<Metadata> {
  const t = getDictionary(forceLocale);
  return buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: t.aiNews.title, brand: t.brand }),
    description: t.aiNews.intro,
    path: "/ai-news",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale
  });
}
```

The rendered page must:

- Use `Container className="py-14"`.
- Render one H1 from `t.aiNews.title`.
- Render a search/filter form.
- Query featured articles with `sort: "featured", take: 3`.
- Query latest articles from parsed filters.
- Query hot articles with `sort: "hot", take: 6`.
- Show topics and popular keyword buttons as links to `?q=...`.
- Keep CTA labels soft: `t.aiNews.readMore`.

- [ ] **Step 2: Create route wrappers**

`src/app/(zh-public)/ai-news/page.tsx`:

```tsx
import { AiNewsPageShell, generateAiNewsPageMetadata, aiNewsPageRevalidate } from "@/app/ai-news/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = aiNewsPageRevalidate;

export async function generateMetadata() {
  return generateAiNewsPageMetadata("zh");
}

export default async function AiNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiNewsPageShell searchParams={searchParams} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
```

`src/app/en/ai-news/page.tsx`:

```tsx
import { AiNewsPageShell, generateAiNewsPageMetadata, aiNewsPageRevalidate } from "@/app/ai-news/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = aiNewsPageRevalidate;

export async function generateMetadata() {
  return generateAiNewsPageMetadata("en");
}

export default async function EnglishAiNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="en">
      <AiNewsPageShell searchParams={searchParams} forceLocale="en" />
    </PublicSiteChrome>
  );
}
```

- [ ] **Step 3: Run source test**

Run:

```powershell
npm test -- src/lib/ai-news-source.test.ts
```

Expected: list route assertions pass; detail/API/admin route assertions still fail.

- [ ] **Step 4: Commit**

```powershell
git add -- src/app/ai-news/page-shell.tsx 'src/app/(zh-public)/ai-news/page.tsx' src/app/en/ai-news/page.tsx
git commit -m "Add public AI news list pages"
```

---

## Task 8: Add Public Detail Page And Interactions Client

**Files:**
- Create: `src/app/ai-news/[slug]/page-shell.tsx`
- Create: `src/app/(zh-public)/ai-news/[slug]/page.tsx`
- Create: `src/app/en/ai-news/[slug]/page.tsx`
- Create: `src/components/ai-news-interactions.tsx`
- Modify: `src/lib/seo.ts` if adding schema helper
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Create client interaction component**

Create `src/components/ai-news-interactions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  labels: {
    like: string;
    favorite: string;
    share: string;
    copyLink: string;
    backToTop: string;
    loginRequired: string;
  };
};

export function AiNewsInteractions({ slug, labels }: Props) {
  const [message, setMessage] = useState("");

  async function post(path: "like" | "favorite") {
    const response = await fetch(`/api/ai-news/${slug}/${path}`, { method: "POST" });
    if (response.status === 401) {
      setMessage(labels.loginRequired);
      return;
    }
    setMessage(response.ok ? (path === "like" ? labels.like : labels.favorite) : labels.loginRequired);
  }

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setMessage(labels.copyLink);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: document.title, url: window.location.href });
      return;
    }
    await copy();
  }

  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
      {[
        [labels.like, () => post("like")],
        [labels.favorite, () => post("favorite")],
        [labels.share, share],
        [labels.copyLink, copy],
        [labels.backToTop, () => window.scrollTo({ top: 0, behavior: "smooth" })]
      ].map(([label, action]) => (
        <button
          key={String(label)}
          type="button"
          onClick={action as () => void}
          className={cn("rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)]")}
        >
          {label as string}
        </button>
      ))}
      {message ? <span className="text-sm text-[var(--marketing-accent)]">{message}</span> : null}
    </div>
  );
}
```

- [ ] **Step 2: Create detail page shell**

Implement:

- `generateAiNewsDetailPageMetadata(forceLocale, slug)`
- `AiNewsDetailPageShell({ slug, forceLocale })`
- `LocalizedNewsArticle` resolver inside the file or in `src/lib/ai-news.ts`.

The page must:

- `notFound()` if article missing or not published.
- Use English fields for `forceLocale === "en"`.
- Add `robots.index = false` for English pages that are not indexable.
- Render `StructuredData` with `NewsArticle` and `BreadcrumbList`.
- Render content blocks from `renderNewsContentBlocks`.
- Render TOC from `extractNewsTableOfContents`.
- Render related tools using existing `ToolCard`.
- Render related tutorials as glass cards.
- Render related news as links.
- Render `AiNewsInteractions`.

- [ ] **Step 3: Create detail route wrappers**

`src/app/(zh-public)/ai-news/[slug]/page.tsx` and `src/app/en/ai-news/[slug]/page.tsx` should mirror existing tool detail wrappers:

```tsx
import { AiNewsDetailPageShell, aiNewsDetailPageRevalidate, generateAiNewsDetailPageMetadata } from "@/app/ai-news/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = aiNewsDetailPageRevalidate;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return generateAiNewsDetailPageMetadata("zh", slug);
}

export default async function AiNewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiNewsDetailPageShell slug={slug} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
```

Use `"en"` in the English wrapper.

- [ ] **Step 4: Run source test**

Run:

```powershell
npm test -- src/lib/ai-news-source.test.ts
```

Expected: public route assertions pass; API/admin assertions still fail.

- [ ] **Step 5: Commit**

```powershell
git add -- src/app/ai-news/[slug]/page-shell.tsx 'src/app/(zh-public)/ai-news/[slug]/page.tsx' src/app/en/ai-news/[slug]/page.tsx src/components/ai-news-interactions.tsx src/lib/seo.ts
git commit -m "Add public AI news detail pages"
```

---

## Task 9: Add Admin Actions For News

**Files:**
- Modify: `src/app/admin/actions.ts`
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Add parsing helpers to admin actions**

In `src/app/admin/actions.ts`, import:

```ts
import { resolveNewsSlug, parseNewsRelationIds } from "@/lib/ai-news";
```

Add helper functions near other parsing helpers:

```ts
function parseMultilineItems(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseExternalSources(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [title = "", url = "", sourceType = "authority_media", description = ""] = line.split("|").map((part) => part.trim());
      return { title, url, sourceType, description, sortOrder: index };
    })
    .filter((source) => source.title && /^https?:\/\//i.test(source.url));
}
```

- [ ] **Step 2: Add category and tag upsert actions**

Add:

```ts
export async function upsertNewsCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const name = z.string().min(1).parse(formData.get("name"));
  const slug = resolveNewsSlug({ title: name, slugInput: formData.get("slug")?.toString(), fallbackSeed: Date.now().toString(36) });
  const data = {
    name,
    slug,
    description: parseOptionalString(formData.get("description")),
    status: z.enum(["active", "disabled"]).parse(formData.get("status") ?? "active"),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0)
  };
  const saved = id ? await prisma.newsCategory.update({ where: { id }, data }) : await prisma.newsCategory.create({ data });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "news_category.update" : "news_category.create",
    targetType: "news_category",
    targetId: saved.id,
    summary: id ? "Updated news category." : "Created news category.",
    metadata: { name, slug }
  });
  revalidatePath("/admin/ai-news");
  revalidatePath("/ai-news");
}
```

Add a parallel `upsertNewsTagAction` using `prisma.newsTag`.

- [ ] **Step 3: Add article upsert action**

Add `upsertNewsArticleAction(formData: FormData)`:

- Require admin.
- Parse `id`, `title`, `slug`, `summary`, `content`, `status`.
- Generate unique slug on create and suffix duplicates with a short random suffix.
- Save arrays:
  - `keyTakeaways` from newline input.
  - `englishKeyTakeaways` from newline input.
  - `relatedArticleIds`, `relatedToolIds`, `relatedTutorialIds` with `parseNewsRelationIds`.
- Upsert tags from comma/newline `tags`.
- Replace external sources from `externalSources`.
- Revalidate `/ai-news`, `/en/ai-news`, and article detail path.
- Redirect to `/admin/ai-news/${savedId}?saved=1`.

- [ ] **Step 4: Add archive/delete action**

Add:

```ts
export async function archiveNewsArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const article = await prisma.newsArticle.update({ where: { id }, data: { status: "archived" } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "news_article.archive",
    targetType: "news_article",
    targetId: id,
    summary: "Archived news article.",
    metadata: { title: article.title, slug: article.slug }
  });
  revalidatePath("/admin/ai-news");
  revalidatePath("/ai-news");
  revalidatePath(`/ai-news/${article.slug}`);
  redirect("/admin/ai-news?archived=1");
}
```

- [ ] **Step 5: Run typecheck for action syntax**

Run:

```powershell
npm run typecheck
```

Expected: no TypeScript errors from the new actions.

- [ ] **Step 6: Commit**

```powershell
git add -- src/app/admin/actions.ts
git commit -m "Add AI news admin actions"
```

---

## Task 10: Add Admin News List And Editor Pages

**Files:**
- Create: `src/app/admin/ai-news/page.tsx`
- Create: `src/app/admin/ai-news/[id]/page.tsx`
- Create: `src/app/admin/ai-news-editor.tsx`
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Implement admin list page**

`src/app/admin/ai-news/page.tsx` must:

- Query articles with category, tagLinks, and counts.
- Support query params `q`, `status`, `category`, `tag`, `sort`, `page`.
- Render `AdminSection`.
- Render create link `/admin/ai-news/new`.
- Render filter form.
- Render table with title, category, status, featured/pinned, views, published date, edit link, public preview link.

- [ ] **Step 2: Implement admin editor component**

Create `src/app/admin/ai-news-editor.tsx` with:

- `NewsArticleEditor`
- inputs using `Field`, `inputClass`, `textareaClass`, `selectClass`, `SubmitButton`, `DangerButton`.
- form `action={upsertNewsArticleAction}`.
- hidden `id` and `returnTo`.
- fields from the design spec.
- `externalSources` textarea format hint: `标题|https://example.com|official_announcement|说明`.
- `tags` field from existing tag links.
- English localization fields.
- archive form for existing articles.

- [ ] **Step 3: Implement editor route**

`src/app/admin/ai-news/[id]/page.tsx` must:

- Load article for edit or null for `new`.
- Load categories and tags.
- `notFound()` when editing missing article.
- Render `NewsArticleEditor`.

- [ ] **Step 4: Run source test**

Run:

```powershell
npm test -- src/lib/ai-news-source.test.ts
```

Expected: admin route assertions pass; API/sitemap may still fail.

- [ ] **Step 5: Commit**

```powershell
git add -- src/app/admin/ai-news/page.tsx src/app/admin/ai-news/[id]/page.tsx src/app/admin/ai-news-editor.tsx
git commit -m "Add AI news admin management pages"
```

---

## Task 11: Add Interaction APIs

**Files:**
- Create: `src/app/api/ai-news/[slug]/view/route.ts`
- Create: `src/app/api/ai-news/[slug]/like/route.ts`
- Create: `src/app/api/ai-news/[slug]/favorite/route.ts`
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Add view API**

`src/app/api/ai-news/[slug]/view/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await prisma.newsArticle.updateMany({
    where: { slug, status: "published" },
    data: { viewCount: { increment: 1 } }
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Add like API**

`src/app/api/ai-news/[slug]/like/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const { slug } = await params;
  const article = await prisma.newsArticle.findFirst({ where: { slug, status: "published" }, select: { id: true } });
  if (!article) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const existing = await prisma.newsArticleLike.findUnique({ where: { articleId_userId: { articleId: article.id, userId: user.id } } });
  if (existing) return NextResponse.json({ ok: true, already: true });

  await prisma.$transaction([
    prisma.newsArticleLike.create({ data: { articleId: article.id, userId: user.id } }),
    prisma.newsArticle.update({ where: { id: article.id }, data: { likeCount: { increment: 1 } } })
  ]);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Add favorite API**

Use the same structure as like, replacing `newsArticleLike` with `newsArticleFavorite` and incrementing `favoriteCount`.

- [ ] **Step 4: Run source test**

Run:

```powershell
npm test -- src/lib/ai-news-source.test.ts
```

Expected: API assertions pass; sitemap assertions may still fail.

- [ ] **Step 5: Commit**

```powershell
git add -- src/app/api/ai-news/[slug]/view/route.ts src/app/api/ai-news/[slug]/like/route.ts src/app/api/ai-news/[slug]/favorite/route.ts
git commit -m "Add AI news interaction APIs"
```

---

## Task 12: Add Sitemap And Structured Data Coverage

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/ai-news/page-shell.tsx`
- Modify: `src/app/ai-news/[slug]/page-shell.tsx`
- Test: `src/lib/ai-news-source.test.ts`

- [ ] **Step 1: Add static AI news routes to sitemap**

In `staticRoutes`, add:

```ts
"/ai-news",
"/en/ai-news",
```

In `staticRouteLastModified`, add both with `new Date("2026-06-18T00:00:00.000Z")`.

- [ ] **Step 2: Query published news articles in sitemap**

Add:

```ts
const newsArticles = await prisma.newsArticle
  .findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true, englishTitle: true, englishSummary: true, englishContent: true }
  })
  .catch(() => []);
```

Add to return:

```ts
...newsArticles.flatMap((newsArticle) =>
  (["/ai-news", "/en/ai-news"] as const).map((basePath) => ({
    url: absoluteUrl(`${basePath}/${newsArticle.slug}`),
    lastModified: newsArticle.updatedAt,
    alternates: {
      languages: buildLanguageAlternates(`/ai-news/${newsArticle.slug}`)
    },
    changeFrequency: "weekly" as const,
    priority: 0.75
  }))
)
```

If needed, filter English detail entries with `isEnglishNewsArticleIndexable`.

- [ ] **Step 3: Ensure page shells emit JSON-LD**

List page:

- `CollectionPage`
- `BreadcrumbList`

Detail page:

- `NewsArticle`
- `BreadcrumbList`
- `Organization`
- optional image/video objects.

- [ ] **Step 4: Run source test**

Run:

```powershell
npm test -- src/lib/ai-news-source.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/app/sitemap.ts src/app/ai-news/page-shell.tsx src/app/ai-news/[slug]/page-shell.tsx
git commit -m "Add AI news sitemap and structured data"
```

---

## Task 13: Seed Starter Categories And One Published Article

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Inspect current seed structure**

Run:

```powershell
Get-Content -Raw -Encoding UTF8 prisma\seed.ts
```

Expected: existing seed content is visible.

- [ ] **Step 2: Add idempotent AI news seed**

Add categories:

- AI快讯
- 模型动态
- 工具推荐
- 实战教程
- 趋势解读
- AI变现

Add one starter published article:

- title: `AI资讯与趋势洞察上线：从信息看到行动`
- slug: `ai-news-trend-insights-launch`
- summary: explain the new module.
- content follows the required editorial structure.
- English fields populated enough for English indexing.
- status `published`.
- isFeatured `true`.
- isPinned `true`.

- [ ] **Step 3: Run seed only if local database is available**

Run:

```powershell
npm run prisma:seed
```

Expected: seed succeeds locally. If database is unavailable, skip local seed and rely on deployment migration/seed instructions.

- [ ] **Step 4: Commit**

```powershell
git add -- prisma/seed.ts
git commit -m "Seed starter AI news content"
```

---

## Task 14: Run Full Local Verification

**Files:**
- All changed implementation files.

- [ ] **Step 1: Run tests**

Run:

```powershell
npm test
```

Expected: all Vitest tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: TypeScript exits 0.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: ESLint exits 0.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm run build
```

Expected: Prisma generate and Next build complete successfully.

- [ ] **Step 5: Commit verification fixes if any**

If verification required fixes:

```powershell
git add -- <fixed-files>
git commit -m "Fix AI news verification issues"
```

---

## Task 15: Browser Smoke Check With Playwright

**Files:**
- No source files unless browser checks reveal defects.

- [ ] **Step 1: Start local production or dev server**

Use the existing dev reset or start command:

```powershell
npm run dev
```

Expected: local server starts on a reachable port.

- [ ] **Step 2: Check desktop pages**

Use Playwright to visit:

- `http://localhost:3000/ai-news`
- `http://localhost:3000/en/ai-news`
- `http://localhost:3000/ai-news/ai-news-trend-insights-launch`
- `http://localhost:3000/en/ai-news/ai-news-trend-insights-launch`

Expected:

- No 404.
- H1 visible.
- Header visible.
- Cards do not overlap.
- JSON-LD script exists.
- Canonical and hreflang links exist.

- [ ] **Step 3: Check mobile viewport**

Set viewport to 390 x 844 and recheck list and detail.

Expected:

- No horizontal scroll.
- TOC is usable or gracefully stacked.
- Header controls do not overlap.
- Interaction buttons wrap cleanly.

- [ ] **Step 4: Check admin route**

Visit:

- `/admin/ai-news`
- `/admin/ai-news/new`

Expected:

- Redirects to login if not signed in.
- Works for admin session if available.

---

## Task 16: Push And Deploy

**Files:**
- No direct edits unless deployment reveals environment issues.

- [ ] **Step 1: Confirm worktree state**

Run:

```powershell
git status --short --branch
```

Expected: branch contains committed local work and no accidental untracked implementation files.

- [ ] **Step 2: Push and deploy with existing script**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\push-and-deploy.ps1 -CommitMessage "Add AI news trend insights module" -RunBuild
```

Expected:

- GitHub push succeeds.
- Tencent Cloud receives the latest commit.
- `npm run build` or deployment build succeeds.
- Service restarts.

- [ ] **Step 3: Run production migration if deploy script does not do it**

If deployment logs do not show Prisma migration deploy, run the documented server migration step from `docs/tencent-cloud-push-deploy-workflow.md`.

Expected: `20260618120000_add_ai_news_module` is applied.

---

## Task 17: Live Verification

**Files:**
- No direct edits unless live checks reveal defects.

- [ ] **Step 1: Check live public pages**

Use Playwright against:

- `https://www.enhe-tech.com.cn/ai-news`
- `https://www.enhe-tech.com.cn/en/ai-news`
- `https://www.enhe-tech.com.cn/ai-news/ai-news-trend-insights-launch`
- `https://www.enhe-tech.com.cn/en/ai-news/ai-news-trend-insights-launch`

Expected:

- HTTP 200.
- Mobile rendering is usable.
- Metadata is localized.
- JSON-LD is present.

- [ ] **Step 2: Check live SEO utility pages**

Visit:

- `https://www.enhe-tech.com.cn/sitemap.xml`
- `https://www.enhe-tech.com.cn/robots.txt`

Expected:

- Sitemap includes AI news list and starter article URLs.
- Robots references sitemap and does not block public AI news.

- [ ] **Step 3: Final report**

Report:

- Modified files.
- New Prisma models and tables.
- New routes.
- New APIs.
- Migration command.
- How to create the first AI news item in admin.
- Verification commands and outcomes.
- Git commit hash and deployment status.

---

## Plan Self-Review

- Spec coverage: This plan covers the confirmed design spec: public list/detail pages, admin management, Prisma models, interaction APIs, SEO, JSON-LD, sitemap, tests, deployment, and live verification.
- Placeholder scan: The plan does not contain deferred placeholders. Where implementation is broad, the task gives exact file ownership, required behavior, and concrete commands.
- Type consistency: `NewsArticle`, `NewsCategory`, `NewsTag`, `NewsExternalSource`, `NewsArticleFavorite`, and `NewsArticleLike` names match Prisma, actions, route expectations, and tests.
- Risk note: The module is broad. If implementation time becomes long, finish through Task 12 first because that creates the minimum public/admin/SEO loop, then add seed/browser/deploy verification.
