# AI News Auto Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure automatic import path so generated ENHE AI news articles can be written into the existing AI news admin module, visible as editable admin records and optionally published immediately.

**Architecture:** Add import metadata to `NewsArticle`, then implement a shared import service that validates a structured payload and writes `NewsArticle`, `NewsCategory`, `NewsTag`, `NewsArticleTag`, `NewsExternalSource`, and `AdminAuditLog` records. Expose it through a bearer-token-protected `POST /api/admin/ai-news/import` route and a local `scripts/publish-ai-news.ts` helper.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma 6, PostgreSQL, Zod, Vitest, tsx.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add import metadata fields and indexes to `NewsArticle`.
- Create: `prisma/migrations/20260618143000_add_ai_news_import_metadata/migration.sql`
  - Add nullable columns and indexes to `news_articles`.
- Modify: `.env.example`
  - Document `AI_NEWS_IMPORT_TOKEN` and `AI_NEWS_IMPORT_URL`.
- Create: `src/lib/ai-news-import.ts`
  - Own payload schemas, token verification, content safety checks, slug/category/tag/source normalization, and import persistence.
- Create: `src/lib/ai-news-import.test.ts`
  - Test validation helpers and import persistence with mocked Prisma-like delegates.
- Create: `src/lib/ai-news-auto-publishing-source.test.ts`
  - Source-contract tests for route, script, env docs, schema metadata, and admin badge source.
- Create: `src/app/api/admin/ai-news/import/route.ts`
  - Next.js route handler that checks the bearer token, validates JSON, calls the import service, revalidates paths, and returns JSON.
- Modify: `src/app/admin/ai-news/page.tsx`
  - Show an `自动导入` badge for imported records.
- Create: `scripts/publish-ai-news.ts`
  - CLI helper that sends generated JSON to the import endpoint.

---

### Task 1: Add Source-Contract Tests For Auto Publishing

**Files:**
- Create: `src/lib/ai-news-auto-publishing-source.test.ts`

- [ ] **Step 1: Write the failing source-contract test**

Create `src/lib/ai-news-auto-publishing-source.test.ts`:

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

describe("AI news auto publishing source contracts", () => {
  it("adds a token-protected import route and shared import service", () => {
    expect(exists("src/app/api/admin/ai-news/import/route.ts")).toBe(true);
    expect(exists("src/lib/ai-news-import.ts")).toBe(true);

    const route = read("src/app/api/admin/ai-news/import/route.ts");
    expect(route).toContain("importAiNewsArticle");
    expect(route).toContain("verifyAiNewsImportToken");
    expect(route).toContain("NextResponse.json");
    expect(route).not.toContain("requireAdmin");
  });

  it("documents import environment variables and provides a local publishing script", () => {
    expect(read(".env.example")).toContain("AI_NEWS_IMPORT_TOKEN");
    expect(read(".env.example")).toContain("AI_NEWS_IMPORT_URL");
    expect(exists("scripts/publish-ai-news.ts")).toBe(true);

    const script = read("scripts/publish-ai-news.ts");
    expect(script).toContain("AI_NEWS_IMPORT_TOKEN");
    expect(script).toContain("AI_NEWS_IMPORT_URL");
    expect(script).toContain("Authorization");
    expect(script).toContain("Bearer");
  });

  it("adds import metadata to NewsArticle and exposes an admin badge", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("sourceChannel");
    expect(schema).toContain("@map(\"source_channel\")");
    expect(schema).toContain("importedAt");
    expect(schema).toContain("@map(\"imported_at\")");
    expect(schema).toContain("importBatchId");
    expect(schema).toContain("@map(\"import_batch_id\")");
    expect(schema).toContain("rawImportPayload");
    expect(schema).toContain("@map(\"raw_import_payload\")");
    expect(schema).toContain("@@index([sourceChannel, importedAt])");
    expect(schema).toContain("@@index([importBatchId])");

    const adminList = read("src/app/admin/ai-news/page.tsx");
    expect(adminList).toContain("sourceChannel");
    expect(adminList).toContain("自动导入");
  });
});
```

- [ ] **Step 2: Run the source-contract test and verify it fails**

Run:

```bash
npm test -- src/lib/ai-news-auto-publishing-source.test.ts
```

Expected: FAIL because the route, service, script, metadata fields, and badge do not exist yet.

- [ ] **Step 3: Commit the failing source-contract test**

```bash
git add src/lib/ai-news-auto-publishing-source.test.ts
git commit -m "test: add ai news auto publishing source contracts"
```

---

### Task 2: Add Import Metadata To Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260618143000_add_ai_news_import_metadata/migration.sql`

- [ ] **Step 1: Update `NewsArticle` fields**

In `prisma/schema.prisma`, add these fields after `canonicalUrl` or near the other editorial metadata fields in `model NewsArticle`:

```prisma
  sourceChannel          String?              @map("source_channel")
  importedAt             DateTime?            @map("imported_at")
  importBatchId          String?              @map("import_batch_id")
  rawImportPayload       Json?                @map("raw_import_payload")
```

Add these indexes near the existing `NewsArticle` indexes:

```prisma
  @@index([sourceChannel, importedAt])
  @@index([importBatchId])
```

The final index block should include the existing indexes and the new ones:

```prisma
  @@index([status, publishedAt])
  @@index([categoryId, status])
  @@index([isFeatured, isPinned, sortOrder])
  @@index([sourceChannel, importedAt])
  @@index([importBatchId])
  @@map("news_articles")
```

- [ ] **Step 2: Add the SQL migration**

Create `prisma/migrations/20260618143000_add_ai_news_import_metadata/migration.sql`:

```sql
ALTER TABLE "news_articles"
  ADD COLUMN "source_channel" TEXT,
  ADD COLUMN "imported_at" TIMESTAMP(3),
  ADD COLUMN "import_batch_id" TEXT,
  ADD COLUMN "raw_import_payload" JSONB;

CREATE INDEX "news_articles_source_channel_imported_at_idx"
  ON "news_articles"("source_channel", "imported_at");

CREATE INDEX "news_articles_import_batch_id_idx"
  ON "news_articles"("import_batch_id");
```

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
npm run prisma:generate
```

Expected: PASS, Prisma client generated successfully.

- [ ] **Step 4: Run the source-contract test**

Run:

```bash
npm test -- src/lib/ai-news-auto-publishing-source.test.ts
```

Expected: still FAIL, but schema-related assertions should now pass.

- [ ] **Step 5: Commit schema and migration**

```bash
git add prisma/schema.prisma prisma/migrations/20260618143000_add_ai_news_import_metadata/migration.sql
git commit -m "feat: add ai news import metadata"
```

---

### Task 3: Build And Test The Import Service

**Files:**
- Create: `src/lib/ai-news-import.ts`
- Create: `src/lib/ai-news-import.test.ts`

- [ ] **Step 1: Write tests for token and payload validation**

Create the first part of `src/lib/ai-news-import.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  aiNewsImportPayloadSchema,
  buildAiNewsImportData,
  importAiNewsArticle,
  rejectUnsafeNewsImportContent,
  verifyAiNewsImportToken
} from "@/lib/ai-news-import";

describe("AI news import helpers", () => {
  it("verifies bearer tokens without accepting missing or wrong values", () => {
    expect(verifyAiNewsImportToken("Bearer secret-token", "secret-token")).toBe(true);
    expect(verifyAiNewsImportToken("Bearer wrong", "secret-token")).toBe(false);
    expect(verifyAiNewsImportToken(null, "secret-token")).toBe(false);
    expect(verifyAiNewsImportToken("secret-token", "secret-token")).toBe(false);
    expect(verifyAiNewsImportToken("Bearer secret-token", "")).toBe(false);
  });

  it("rejects unsafe raw HTML and script-like content", () => {
    expect(() => rejectUnsafeNewsImportContent("## 正文\n\n普通段落")).not.toThrow();
    expect(() => rejectUnsafeNewsImportContent("<!doctype html><html><body>x</body></html>")).toThrow("raw HTML");
    expect(() => rejectUnsafeNewsImportContent("<script>alert(1)</script>")).toThrow("script");
    expect(() => rejectUnsafeNewsImportContent("<style>body{}</style>")).toThrow("style");
    expect(() => rejectUnsafeNewsImportContent("<p onclick=\"alert(1)\">x</p>")).toThrow("event handler");
  });

  it("validates the required import payload shape", () => {
    const parsed = aiNewsImportPayloadSchema.parse({
      publishMode: "draft",
      importBatchId: "batch-1",
      article: {
        title: "中国智能体落地提速",
        summary: "中国AI智能体应用案例增多。",
        content: "## 事实概述\n\n正文",
        externalSources: [
          {
            title: "中国网信网",
            url: "https://www.cac.gov.cn/2026-05/08/c_1779979789523320.htm",
            sourceType: "official_announcement"
          }
        ]
      }
    });

    expect(parsed.publishMode).toBe("draft");
    expect(parsed.article.externalSources).toHaveLength(1);
  });

  it("rejects payloads without valid external sources", () => {
    expect(() =>
      aiNewsImportPayloadSchema.parse({
        article: {
          title: "标题",
          summary: "摘要",
          content: "## 正文\n\n内容",
          externalSources: []
        }
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- src/lib/ai-news-import.test.ts
```

Expected: FAIL because `src/lib/ai-news-import.ts` does not exist.

- [ ] **Step 3: Implement validation helpers**

Create `src/lib/ai-news-import.ts` with this foundation:

```ts
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { resolveNewsSlug } from "@/lib/ai-news";
import { prisma } from "@/lib/db";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { tagSlug } from "@/lib/tool-content";

export const aiNewsSourceSchema = z.object({
  title: z.string().trim().min(1).max(180),
  url: z.string().trim().url().refine((url) => /^https?:\/\//i.test(url), "Source URL must be HTTP or HTTPS."),
  sourceType: z.string().trim().min(1).max(80).default("authority_media"),
  description: z.string().trim().max(300).optional().nullable()
});

export const aiNewsImportArticleSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().max(220).optional().nullable(),
  subtitle: z.string().trim().max(220).optional().nullable(),
  summary: z.string().trim().min(1).max(1200),
  content: z.string().trim().min(1).max(50000),
  coverImage: z.string().trim().url().optional().nullable(),
  author: z.string().trim().max(80).optional().nullable(),
  keywords: z.string().trim().max(500).optional().nullable(),
  seoTitle: z.string().trim().max(180).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
  seoKeywords: z.string().trim().max(500).optional().nullable(),
  categorySlug: z.string().trim().max(120).optional().nullable(),
  categoryName: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  keyTakeaways: z.array(z.string().trim().min(1).max(240)).max(8).default([]),
  impactNotes: z.string().trim().max(2000).optional().nullable(),
  conclusion: z.string().trim().max(2000).optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  externalSources: z.array(aiNewsSourceSchema).min(1).max(12)
});

export const aiNewsImportPayloadSchema = z.object({
  importBatchId: z.string().trim().max(120).optional().nullable(),
  publishMode: z.enum(["draft", "published"]).default("draft"),
  article: aiNewsImportArticleSchema
});

export type AiNewsImportPayload = z.infer<typeof aiNewsImportPayloadSchema>;
export type AiNewsImportResult = {
  articleId: string;
  slug: string;
  status: "draft" | "published";
  adminUrl: string;
  publicUrl: string | null;
};

const autoImportSourceChannel = "ai_auto_import";

export function verifyAiNewsImportToken(authorizationHeader: string | null, expectedToken: string | undefined) {
  if (!expectedToken) return false;
  const prefix = "Bearer ";
  if (!authorizationHeader?.startsWith(prefix)) return false;
  const actualToken = authorizationHeader.slice(prefix.length).trim();
  if (!actualToken) return false;
  return actualToken.length === expectedToken.length && actualToken === expectedToken;
}

export function rejectUnsafeNewsImportContent(content: string) {
  const lowered = content.toLowerCase();
  if (lowered.includes("<!doctype") || lowered.includes("<html")) {
    throw new Error("News import content must be Markdown-like text, not raw HTML.");
  }
  if (/<script[\s>]/i.test(content) || /<\/script>/i.test(content)) {
    throw new Error("News import content cannot contain script tags.");
  }
  if (/<style[\s>]/i.test(content) || /<\/style>/i.test(content)) {
    throw new Error("News import content cannot contain style tags.");
  }
  if (/\son[a-z]+\s*=/i.test(content)) {
    throw new Error("News import content cannot contain inline event handler attributes.");
  }
}

export function sanitizeRawImportPayload(payload: AiNewsImportPayload): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

export function buildAiNewsImportData(payload: AiNewsImportPayload, now = new Date()) {
  rejectUnsafeNewsImportContent(payload.article.content);
  const status = payload.publishMode === "published" ? "published" : "draft";
  return {
    status,
    sourceChannel: autoImportSourceChannel,
    importedAt: now,
    importBatchId: payload.importBatchId ?? null,
    rawImportPayload: sanitizeRawImportPayload(payload),
    publishedAt: status === "published" ? (payload.article.publishedAt ? new Date(payload.article.publishedAt) : now) : null
  } as const;
}

async function resolveUniqueImportedNewsSlug(input: { title: string; slugInput?: string | null; fallbackSeed: string }) {
  let slug = resolveNewsSlug(input);
  const baseSlug = slug;
  let retry = 0;

  while (await prisma.newsArticle.findFirst({ where: { slug }, select: { id: true } })) {
    retry += 1;
    slug = `${baseSlug}-${retry + 1}`;
    if (retry > 20) {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
      break;
    }
  }

  return slug;
}

async function resolveImportCategory(article: AiNewsImportPayload["article"]) {
  const categorySlug = resolveNewsSlug({
    title: article.categoryName ?? "AI快讯",
    slugInput: article.categorySlug ?? "ai-news-flash",
    fallbackSeed: "ai-news-flash"
  });
  const categoryName = article.categoryName ?? "AI快讯";

  return prisma.newsCategory.upsert({
    where: { slug: categorySlug },
    update: { name: categoryName, status: "active" },
    create: {
      name: categoryName,
      slug: categorySlug,
      description: "自动导入的 AI 前沿资讯默认分类。",
      status: "active"
    }
  });
}

async function syncImportedTags(articleId: string, tagNames: string[]) {
  const uniqueNames = Array.from(new Set(tagNames.map((name) => name.trim()).filter(Boolean)));
  const tags = await Promise.all(
    uniqueNames.map((name) =>
      prisma.newsTag.upsert({
        where: { name },
        update: { status: "active" },
        create: { name, slug: tagSlug(name), status: "active" }
      })
    )
  );

  await prisma.newsArticleTag.deleteMany({ where: { articleId } });
  if (tags.length) {
    await prisma.newsArticleTag.createMany({
      data: tags.map((tag) => ({ articleId, tagId: tag.id })),
      skipDuplicates: true
    });
  }
}

async function syncImportedSources(articleId: string, sources: AiNewsImportPayload["article"]["externalSources"]) {
  await prisma.newsExternalSource.deleteMany({ where: { articleId } });
  await prisma.newsExternalSource.createMany({
    data: sources.map((source, index) => ({
      articleId,
      title: source.title,
      url: source.url,
      sourceType: source.sourceType,
      description: source.description ?? null,
      sortOrder: index
    }))
  });
}

export async function importAiNewsArticle(payloadInput: unknown, now = new Date()): Promise<AiNewsImportResult> {
  const payload = aiNewsImportPayloadSchema.parse(payloadInput);
  const importData = buildAiNewsImportData(payload, now);
  const category = await resolveImportCategory(payload.article);
  const slug = await resolveUniqueImportedNewsSlug({
    title: payload.article.title,
    slugInput: payload.article.slug,
    fallbackSeed: payload.importBatchId ?? now.getTime().toString(36)
  });

  const article = await prisma.newsArticle.create({
    data: {
      title: payload.article.title,
      slug,
      subtitle: payload.article.subtitle ?? null,
      description: payload.article.seoDescription ?? payload.article.summary,
      keywords: payload.article.keywords ?? null,
      summary: payload.article.summary,
      content: payload.article.content,
      coverImage: payload.article.coverImage ?? null,
      author: payload.article.author ?? "恩禾ENHE AI",
      status: importData.status,
      categoryId: category.id,
      publishedAt: importData.publishedAt,
      readingTime: Math.max(1, Math.ceil(payload.article.content.length / 700)),
      seoTitle: payload.article.seoTitle ?? payload.article.title,
      seoDescription: payload.article.seoDescription ?? payload.article.summary.slice(0, 180),
      seoKeywords: payload.article.seoKeywords ?? payload.article.keywords ?? null,
      keyTakeaways: payload.article.keyTakeaways,
      impactNotes: payload.article.impactNotes ?? null,
      conclusion: payload.article.conclusion ?? null,
      sourceChannel: importData.sourceChannel,
      importedAt: importData.importedAt,
      importBatchId: importData.importBatchId,
      rawImportPayload: importData.rawImportPayload
    }
  });

  await syncImportedTags(article.id, payload.article.tags);
  await syncImportedSources(article.id, payload.article.externalSources);

  await writeAdminAuditLog({
    adminId: null,
    action: "news_article.auto_import",
    targetType: "news_article",
    targetId: article.id,
    summary: "Auto-imported AI news article.",
    metadata: {
      title: article.title,
      slug: article.slug,
      status: article.status,
      sourceChannel: importData.sourceChannel,
      importBatchId: importData.importBatchId,
      sourceCount: payload.article.externalSources.length,
      tagCount: payload.article.tags.length
    }
  });

  return {
    articleId: article.id,
    slug: article.slug,
    status: article.status === "published" ? "published" : "draft",
    adminUrl: `/admin/ai-news/${article.id}`,
    publicUrl: article.status === "published" ? `/ai-news/${article.slug}` : null
  };
}
```

- [ ] **Step 4: Run validation tests**

Run:

```bash
npm test -- src/lib/ai-news-import.test.ts
```

Expected: PASS for the validation-focused tests.

- [ ] **Step 5: Add import persistence tests with mocked Prisma**

Extend `src/lib/ai-news-import.test.ts` with module mocks before importing the service. If Vitest import hoisting makes this difficult, split persistence tests into `src/lib/ai-news-import-persistence.test.ts`.

Use this test shape:

```ts
const prismaMock = vi.hoisted(() => ({
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
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: vi.fn() }));
```

Add tests:

```ts
it("imports draft news into article, tags, sources, and audit log", async () => {
  prismaMock.newsArticle.findFirst.mockResolvedValue(null);
  prismaMock.newsCategory.upsert.mockResolvedValue({ id: "category-1" });
  prismaMock.newsTag.upsert.mockImplementation(async ({ where }: { where: { name: string } }) => ({
    id: `tag-${where.name}`,
    name: where.name
  }));
  prismaMock.newsArticle.create.mockResolvedValue({
    id: "article-1",
    title: "中国智能体落地提速",
    slug: "ai-news-batch-1",
    status: "draft"
  });

  const result = await importAiNewsArticle({
    importBatchId: "batch-1",
    publishMode: "draft",
    article: {
      title: "中国智能体落地提速",
      summary: "摘要",
      content: "## 事实概述\n\n正文内容",
      tags: ["AI资讯", "AI智能体"],
      externalSources: [{ title: "来源", url: "https://example.com/news", sourceType: "authority_media" }]
    }
  });

  expect(result).toEqual({
    articleId: "article-1",
    slug: "ai-news-batch-1",
    status: "draft",
    adminUrl: "/admin/ai-news/article-1",
    publicUrl: null
  });
  expect(prismaMock.newsArticle.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        status: "draft",
        publishedAt: null,
        sourceChannel: "ai_auto_import",
        importBatchId: "batch-1"
      })
    })
  );
  expect(prismaMock.newsArticleTag.createMany).toHaveBeenCalled();
  expect(prismaMock.newsExternalSource.createMany).toHaveBeenCalled();
});
```

Add a second test for `publishMode: "published"` expecting a non-null `publishedAt` and `publicUrl`.

- [ ] **Step 6: Run persistence tests**

Run:

```bash
npm test -- src/lib/ai-news-import.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit import service**

```bash
git add src/lib/ai-news-import.ts src/lib/ai-news-import.test.ts
git commit -m "feat: add ai news import service"
```

---

### Task 4: Add Protected Import API Route

**Files:**
- Create: `src/app/api/admin/ai-news/import/route.ts`

- [ ] **Step 1: Create the route handler**

Create `src/app/api/admin/ai-news/import/route.ts`:

```ts
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { importAiNewsArticle, verifyAiNewsImportToken } from "@/lib/ai-news-import";

export const dynamic = "force-dynamic";

function errorResponse(status: number, error: string, message: string) {
  return NextResponse.json(
    {
      ok: false,
      error,
      message
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  if (!verifyAiNewsImportToken(request.headers.get("authorization"), process.env.AI_NEWS_IMPORT_TOKEN)) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid AI news import token.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  try {
    const result = await importAiNewsArticle(payload);
    revalidatePath("/admin/ai-news");
    if (result.status === "published") {
      revalidatePath("/ai-news");
      revalidatePath("/en/ai-news");
      revalidatePath(result.publicUrl ?? `/ai-news/${result.slug}`);
      revalidatePath(`/en/ai-news/${result.slug}`);
    }

    return NextResponse.json({
      ok: true,
      articleId: result.articleId,
      slug: result.slug,
      status: result.status,
      adminUrl: result.adminUrl,
      publicUrl: result.publicUrl
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid AI news import payload.");
    }
    const message = error instanceof Error ? error.message : "AI news import failed.";
    return errorResponse(500, "IMPORT_FAILED", message);
  }
}
```

- [ ] **Step 2: Run the source-contract test**

Run:

```bash
npm test -- src/lib/ai-news-auto-publishing-source.test.ts
```

Expected: still FAIL until env docs, script, and admin badge are added.

- [ ] **Step 3: Commit route**

```bash
git add src/app/api/admin/ai-news/import/route.ts
git commit -m "feat: add ai news import route"
```

---

### Task 5: Add Admin Imported Badge

**Files:**
- Modify: `src/app/admin/ai-news/page.tsx`

- [ ] **Step 1: Include `sourceChannel` in the admin list render**

`sourceChannel` is a scalar on `NewsArticle`, so no query include is needed. In the title cell inside `articles.map`, add a badge near the title.

Replace:

```tsx
<p className="font-semibold text-[#E8EEF8]">{article.title}</p>
```

With:

```tsx
<div className="flex flex-wrap items-center gap-2">
  <p className="font-semibold text-[#E8EEF8]">{article.title}</p>
  {article.sourceChannel === "ai_auto_import" ? (
    <span className="rounded-full border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-2 py-0.5 text-[11px] font-semibold text-[#48F5D3]">
      自动导入
    </span>
  ) : null}
</div>
```

- [ ] **Step 2: Run source-contract test**

Run:

```bash
npm test -- src/lib/ai-news-auto-publishing-source.test.ts
```

Expected: still FAIL until env docs and script are added.

- [ ] **Step 3: Commit badge**

```bash
git add src/app/admin/ai-news/page.tsx
git commit -m "feat: show imported ai news badge"
```

---

### Task 6: Add Local Publishing Script And Env Docs

**Files:**
- Modify: `.env.example`
- Create: `scripts/publish-ai-news.ts`

- [ ] **Step 1: Document env vars**

Append to `.env.example`:

```env

# AI news auto publishing import endpoint. Use a long random token in production.
AI_NEWS_IMPORT_TOKEN=""
AI_NEWS_IMPORT_URL="http://localhost:3000/api/admin/ai-news/import"
```

- [ ] **Step 2: Create the publishing script**

Create `scripts/publish-ai-news.ts`:

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type PublishMode = "draft" | "published";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function assertPublishMode(value: string | null): PublishMode {
  if (value === "published") return "published";
  return "draft";
}

async function main() {
  const file = readArg("--file");
  if (!file) {
    throw new Error("Missing --file path to AI news JSON payload.");
  }

  const importUrl = process.env.AI_NEWS_IMPORT_URL;
  const importToken = process.env.AI_NEWS_IMPORT_TOKEN;
  if (!importUrl) throw new Error("Missing AI_NEWS_IMPORT_URL.");
  if (!importToken) throw new Error("Missing AI_NEWS_IMPORT_TOKEN.");

  const publishMode = assertPublishMode(readArg("--mode"));
  const raw = await readFile(resolve(file), "utf8");
  const payload = JSON.parse(raw) as Record<string, unknown>;
  payload.publishMode = publishMode;

  const response = await fetch(importUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${importToken}`
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json()) as {
    ok?: boolean;
    error?: string;
    message?: string;
    articleId?: string;
    adminUrl?: string;
    publicUrl?: string | null;
  };

  if (!response.ok || !body.ok) {
    throw new Error(`${body.error ?? "IMPORT_FAILED"}: ${body.message ?? response.statusText}`);
  }

  console.log(`Imported AI news article: ${body.articleId}`);
  console.log(`Admin URL: ${body.adminUrl}`);
  if (body.publicUrl) {
    console.log(`Public URL: ${body.publicUrl}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
```

- [ ] **Step 3: Run source-contract test**

Run:

```bash
npm test -- src/lib/ai-news-auto-publishing-source.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run TypeScript check for script compatibility**

Run:

```bash
npm run typecheck
```

Expected: PASS or only fail on code unrelated to this work. If it fails because `fetch` or Node globals are not recognized, adjust `tsconfig.json` only if necessary and verify the rest of the app still typechecks.

- [ ] **Step 5: Commit script and env docs**

```bash
git add .env.example scripts/publish-ai-news.ts
git commit -m "feat: add ai news publishing script"
```

---

### Task 7: Add Route-Focused Tests If Needed

**Files:**
- Optional Create: `src/app/api/admin/ai-news/import/route.test.ts`

Only do this if the source-contract plus import service tests do not provide enough confidence in route behavior.

- [ ] **Step 1: Write route tests with mocks**

Create `src/app/api/admin/ai-news/import/route.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const importMock = vi.hoisted(() => vi.fn());
const revalidateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai-news-import", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai-news-import")>();
  return {
    ...actual,
    importAiNewsArticle: importMock
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: revalidateMock
}));

import { POST } from "@/app/api/admin/ai-news/import/route";

describe("AI news import route", () => {
  it("rejects invalid tokens", async () => {
    process.env.AI_NEWS_IMPORT_TOKEN = "secret";
    const response = await POST(
      new Request("http://localhost/api/admin/ai-news/import", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
        body: "{}"
      }) as never
    );

    expect(response.status).toBe(401);
  });

  it("imports valid payloads and revalidates admin path", async () => {
    process.env.AI_NEWS_IMPORT_TOKEN = "secret";
    importMock.mockResolvedValue({
      articleId: "article-1",
      slug: "news-slug",
      status: "draft",
      adminUrl: "/admin/ai-news/article-1",
      publicUrl: null
    });

    const response = await POST(
      new Request("http://localhost/api/admin/ai-news/import", {
        method: "POST",
        headers: { authorization: "Bearer secret", "content-type": "application/json" },
        body: JSON.stringify({ article: {} })
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(revalidateMock).toHaveBeenCalledWith("/admin/ai-news");
  });
});
```

- [ ] **Step 2: Run route tests**

Run:

```bash
npm test -- src/app/api/admin/ai-news/import/route.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit optional route tests**

```bash
git add src/app/api/admin/ai-news/import/route.test.ts
git commit -m "test: cover ai news import route"
```

---

### Task 8: Final Verification

**Files:**
- No new files unless fixes are needed.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/lib/ai-news-auto-publishing-source.test.ts src/lib/ai-news-import.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full unit test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Manually smoke test local draft import**

Start the app if it is not already running:

```bash
npm run dev
```

Create a temporary payload file at `output/ai-news/manual-import-smoke.json`:

```json
{
  "importBatchId": "manual-import-smoke",
  "article": {
    "title": "AI资讯自动导入烟测",
    "summary": "这是一篇用于验证自动导入链路的草稿资讯。",
    "content": "## 事实概述\n\n这是一篇草稿导入测试。\n\n## 总结\n\n后台应能看到并编辑这篇资讯。",
    "tags": ["AI资讯", "自动导入"],
    "externalSources": [
      {
        "title": "ENHE AI",
        "url": "https://www.enhe-tech.com.cn/",
        "sourceType": "official_announcement",
        "description": "站点首页"
      }
    ]
  }
}
```

In a separate shell, run:

```bash
$env:AI_NEWS_IMPORT_URL="http://localhost:3000/api/admin/ai-news/import"
$env:AI_NEWS_IMPORT_TOKEN="<same token from local .env>"
npx tsx scripts/publish-ai-news.ts --file output/ai-news/manual-import-smoke.json --mode draft
```

Expected:

- Script prints an article ID.
- Script prints an admin URL.
- `/admin/ai-news` shows the article with `自动导入`.
- The article can be opened and edited in `/admin/ai-news/{id}`.
- The draft article is not visible on the public `/ai-news` list until published.

- [ ] **Step 7: Commit final fixes**

If final verification required any fixes:

```bash
git add <changed-files>
git commit -m "fix: verify ai news auto publishing"
```

If no fixes were needed, skip this commit.

---

## Plan Self-Review

- Spec coverage: covers token-protected import API, default draft mode, explicit published mode, admin visibility, metadata, audit logging, script, env variables, validation, route revalidation, and tests.
- Placeholder scan: no `TBD`, `TODO`, or "fill in later" instructions remain.
- Type consistency: service names, route path, metadata field names, and script env vars match the approved spec.
- Scope check: implementation stays within the existing AI news module and does not add scheduled generation, browser automation, or newsletter sending.
