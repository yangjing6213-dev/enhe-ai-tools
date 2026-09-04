import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { resolveAiNewsCanonicalSlug, resolveNewsSlug } from "@/lib/ai-news";
import { buildAiNewsCoverImageDuplicateWhere } from "@/lib/ai-news-cover-images";
import { prisma } from "@/lib/db";
import { tagSlug } from "@/lib/tool-content";
import { aiNewsImportPayloadSchema, aiNewsSourceSchema, type AiNewsImportPayload, type AiNewsImportArticle } from "@/lib/ai-news-import-schema";

export { aiNewsImportPayloadSchema, aiNewsImportArticleSchema, aiNewsSourceSchema, type AiNewsImportPayload, type AiNewsImportArticle } from "@/lib/ai-news-import-schema";

const defaultAiNewsCategory = {
  name: "AI快讯",
  slug: "ai-news-flash"
};

const aiNewsImportSourceChannel = "ai_auto_import";
const maxSlugCollisionAttempts = 5;

export type AiNewsImportData = {
  category: {
    name: string;
    slug: string;
  };
  article: Omit<Prisma.NewsArticleUncheckedCreateInput, "categoryId">;
  tags: Array<{ name: string; slug: string }>;
  externalSources: Array<z.infer<typeof aiNewsSourceSchema> & { sortOrder: number }>;
};

export type AiNewsImportResult = {
  articleId: string;
  slug: string;
  canonicalSlug: string;
  status: "draft" | "published";
  adminUrl: string;
  publicUrl: string | null;
};

export class DuplicateAiNewsCoverImageError extends Error {
  readonly code = "DUPLICATE_COVER_IMAGE";

  constructor(readonly coverImage: string) {
    super("AI news cover image is already used by another article.");
    this.name = "DuplicateAiNewsCoverImageError";
  }
}

export function verifyAiNewsImportToken(authorization: string | null, expectedToken: string | undefined) {
  const expected = expectedToken?.trim();
  if (!expected || !authorization) return false;

  const match = authorization.match(/^Bearer\s+(.+)$/);
  if (!match) return false;

  const receivedBuffer = Buffer.from(match[1]);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function rejectUnsafeNewsImportContent(content: string) {
  if (/<!doctype\s+html\b/i.test(content) || /<html[\s>]/i.test(content)) {
    throw new Error("Imported content cannot contain raw HTML documents.");
  }

  if (/<script[\s>]/i.test(content) || /<\/script\s*>/i.test(content)) {
    throw new Error("Imported content cannot contain script tags.");
  }

  if (/<style[\s>]/i.test(content) || /<\/style\s*>/i.test(content)) {
    throw new Error("Imported content cannot contain style tags.");
  }

  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(content)) {
    throw new Error("Imported content cannot contain inline event handler attributes.");
  }
}

function buildImportCategory(article: AiNewsImportArticle) {
  if (article.categorySlug) {
    return {
      name: article.categoryName ?? defaultAiNewsCategory.name,
      slug: resolveNewsSlug({ title: article.categorySlug, slugInput: article.categorySlug, fallbackSeed: defaultAiNewsCategory.slug })
    };
  }

  if (article.categoryName) {
    return {
      name: article.categoryName,
      slug: resolveNewsSlug({ title: article.categoryName, fallbackSeed: defaultAiNewsCategory.slug })
    };
  }

  return defaultAiNewsCategory;
}

function normalizeImportTags(tagNames: string[]) {
  const tagsBySlug = new Map<string, { name: string; slug: string }>();
  for (const tagName of tagNames) {
    const name = tagName.trim();
    if (!name) continue;
    const slug = tagSlug(name);
    if (!tagsBySlug.has(slug)) {
      tagsBySlug.set(slug, { name, slug });
    }
  }
  return Array.from(tagsBySlug.values());
}

export function buildAiNewsImportData(payload: AiNewsImportPayload, now = new Date()): AiNewsImportData {
  rejectUnsafeNewsImportContent(payload.article.content);
  if (payload.article.englishContent) {
    rejectUnsafeNewsImportContent(payload.article.englishContent);
  }

  const status = payload.publishMode;
  const publishedAt = status === "published" ? payload.publishedAt ?? now : null;
  const fallbackSeed = payload.importBatchId ?? now.getTime().toString(36);
  const slug = resolveNewsSlug({
    title: payload.article.title,
    slugInput: payload.article.slug,
    fallbackSeed
  });
  const category = buildImportCategory(payload.article);

  return {
    category,
    article: {
      title: payload.article.title,
      slug,
      subtitle: payload.article.subtitle ?? null,
      description: payload.article.description ?? null,
      keywords: payload.article.keywords ?? null,
      summary: payload.article.summary,
      content: payload.article.content,
      coverImage: payload.article.coverImage ?? null,
      videoUrl: payload.article.videoUrl ?? null,
      videoTitle: payload.article.videoTitle ?? null,
      videoDescription: payload.article.videoDescription ?? null,
      author: payload.article.author ?? null,
      status,
      publishedAt,
      readingTime: payload.article.readingTime ?? 5,
      viewCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      isFeatured: false,
      isPinned: false,
      sortOrder: 0,
      seoTitle: payload.article.seoTitle ?? null,
      seoDescription: payload.article.seoDescription ?? null,
      seoKeywords: payload.article.seoKeywords ?? null,
      canonicalUrl: payload.article.canonicalUrl ?? null,
      keyTakeaways: payload.article.keyTakeaways,
      impactNotes: payload.article.impactNotes ?? null,
      conclusion: payload.article.conclusion ?? null,
      relatedArticleIds: payload.article.relatedArticleIds,
      relatedToolIds: payload.article.relatedToolIds,
      relatedTutorialIds: payload.article.relatedTutorialIds,
      englishTitle: payload.article.englishTitle ?? null,
      englishSubtitle: payload.article.englishSubtitle ?? null,
      englishDescription: payload.article.englishDescription ?? null,
      englishSummary: payload.article.englishSummary ?? null,
      englishContent: payload.article.englishContent ?? null,
      englishKeywords: payload.article.englishKeywords ?? null,
      englishSeoTitle: payload.article.englishSeoTitle ?? null,
      englishSeoDescription: payload.article.englishSeoDescription ?? null,
      englishSeoKeywords: payload.article.englishSeoKeywords ?? null,
      englishKeyTakeaways: payload.article.englishKeyTakeaways,
      englishImpactNotes: payload.article.englishImpactNotes ?? null,
      englishConclusion: payload.article.englishConclusion ?? null
    },
    tags: normalizeImportTags(payload.article.tags),
    externalSources: payload.article.externalSources.map((source, index) => ({
      ...source,
      description: source.description ?? undefined,
      sortOrder: index
    }))
  };
}

export type AiNewsImportTransaction = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

function importSlugCandidate(baseSlug: string, attempt: number) {
  return attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
}

async function resolveUniqueImportSlug(tx: AiNewsImportTransaction, baseSlug: string) {
  for (let attempt = 1; attempt <= maxSlugCollisionAttempts; attempt += 1) {
    const slug = importSlugCandidate(baseSlug, attempt);
    const existing = await tx.newsArticle.findFirst({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }

  throw new Error("Unable to resolve a unique AI news article slug.");
}

async function assertUniqueCoverImage(tx: AiNewsImportTransaction, coverImage: string | undefined) {
  if (!coverImage) return;
  const existing = await tx.newsArticle.findFirst({
    where: buildAiNewsCoverImageDuplicateWhere(coverImage),
    select: { id: true }
  });
  if (existing) {
    throw new DuplicateAiNewsCoverImageError(coverImage);
  }
}

function isPrismaUniqueCollision(error: unknown) {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
  );
}

async function createImportAuditLog({
  tx,
  article,
  payload,
  sourceCount,
  tagCount
}: {
  tx: AiNewsImportTransaction;
  article: { id: string; title: string; slug: string; status: string; englishTitle?: string | null };
  payload: AiNewsImportPayload;
  sourceCount: number;
  tagCount: number;
}) {
  await tx.adminAuditLog.create({
    data: {
      adminId: null,
      action: "news_article.auto_import",
      targetType: "news_article",
      targetId: article.id,
      summary: "Auto-imported AI news article.",
      metadata: {
        title: article.title,
        slug: article.slug,
        canonicalSlug: resolveAiNewsCanonicalSlug(article),
        status: article.status,
        importBatchId: payload.importBatchId ?? null,
        sourceChannel: aiNewsImportSourceChannel,
        sourceCount,
        tagCount
      },
      ip: null,
      userAgent: null
    }
  });
}

async function persistAiNewsImportAttempt({
  tx,
  payload,
  now,
  slug,
  preserveTaxonomy = false
}: {
  tx: AiNewsImportTransaction;
  payload: AiNewsImportPayload;
  now: Date;
  slug: string;
  preserveTaxonomy?: boolean;
}) {
  const data = buildAiNewsImportData(
    {
      ...payload,
      article: {
        ...payload.article,
        slug
      }
    },
    now
  );

  const category = await tx.newsCategory.upsert({
    where: { slug: data.category.slug },
    update: preserveTaxonomy ? {} : { status: "active" },
    create: {
      name: data.category.name,
      slug: data.category.slug,
      status: "active"
    }
  });

  const articleCreateData: Prisma.NewsArticleUncheckedCreateInput = {
    ...data.article,
    categoryId: category.id
  };

  const article = await tx.newsArticle.create({ data: articleCreateData });

  const tags = await Promise.all(
    data.tags.map((tag) =>
      tx.newsTag.upsert({
        where: { slug: tag.slug },
        update: preserveTaxonomy ? {} : { status: "active" },
        create: { name: tag.name, slug: tag.slug, status: "active" }
      })
    )
  );

  await tx.newsArticleTag.deleteMany({ where: { articleId: article.id } });
  if (tags.length) {
    await tx.newsArticleTag.createMany({
      data: tags.map((tag) => ({ articleId: article.id, tagId: tag.id })),
      skipDuplicates: true
    });
  }

  await tx.newsExternalSource.deleteMany({ where: { articleId: article.id } });
  await tx.newsExternalSource.createMany({
    data: data.externalSources.map((source) => ({
      articleId: article.id,
      title: source.title,
      url: source.url,
      sourceType: source.sourceType,
      description: source.description ?? null,
      sortOrder: source.sortOrder
    }))
  });

  await createImportAuditLog({
    tx,
    article,
    payload,
    sourceCount: data.externalSources.length,
    tagCount: tags.length
  });

  return article;
}

// The caller owns the transaction, enabling an all-or-nothing bilingual batch.
export async function importAiNewsArticleInTransaction(tx: AiNewsImportTransaction, rawPayload: unknown, now = new Date()) {
  const payload = aiNewsImportPayloadSchema.parse(rawPayload);
  const baseSlug = resolveNewsSlug({ title: payload.article.title, slugInput: payload.article.slug,
    fallbackSeed: payload.importBatchId ?? now.getTime().toString(36) });
  const slug = await resolveUniqueImportSlug(tx, baseSlug);
  await assertUniqueCoverImage(tx, payload.article.coverImage);
  return persistAiNewsImportAttempt({ tx, payload, now, slug, preserveTaxonomy: true });
}

export async function importAiNewsArticle(rawPayload: unknown): Promise<AiNewsImportResult> {
  const payload = aiNewsImportPayloadSchema.parse(rawPayload);
  const now = new Date();
  const baseSlug = resolveNewsSlug({
    title: payload.article.title,
    slugInput: payload.article.slug,
    fallbackSeed: payload.importBatchId ?? now.getTime().toString(36)
  });

  for (let attempt = 1; attempt <= maxSlugCollisionAttempts; attempt += 1) {
    try {
      const article = await prisma.$transaction(async (tx) => {
        const slug = await resolveUniqueImportSlug(tx, importSlugCandidate(baseSlug, attempt));
        await assertUniqueCoverImage(tx, payload.article.coverImage);
        return persistAiNewsImportAttempt({ tx, payload, now, slug });
      });
      const status = article.status as "draft" | "published";
      const canonicalSlug = resolveAiNewsCanonicalSlug(article);

      return {
        articleId: article.id,
        slug: article.slug,
        canonicalSlug,
        status,
        adminUrl: `/admin/ai-news/${article.id}`,
        publicUrl: status === "published" ? `/ai-news/${canonicalSlug}` : null
      };
    } catch (error) {
      if (!isPrismaUniqueCollision(error) || attempt === maxSlugCollisionAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Unable to import AI news article with a unique slug.");
}
