import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isEnglishNewsArticleIndexable } from "@/lib/ai-news";
import { getCanonicalAiNewsSlug } from "@/lib/public-slugs";
import { getAiNewsCoverImageFingerprint } from "@/lib/ai-news-cover-images";
import { importAiNewsArticleInTransaction, type AiNewsImportTransaction } from "@/lib/ai-news-import";
import { auditSchema, batchDigest, batchRequestSchema, digest, sha256Schema, sourceFingerprint, topicSchema,
  type AiNewsBatch, type BatchAudit, type BatchRecord, type BatchResponse, type BatchSnapshot } from "@/lib/ai-news-batch-contract";

const targetType = "ai_news_batch_v2";
const stageAction = "ai_news.batch.staged";
const publishAction = "ai_news.batch.published";
const ledgerTopicSchema = topicSchema.innerType().pick({ kind: true, eventKey: true, primarySourceUrl: true, sourceEvidence: true });
const ledgerSchema = z.object({
  runSlot: z.string(), manifestDigest: sha256Schema, validatorSha256: sha256Schema,
  articleIds: z.array(z.string()).length(6), contentDigests: z.array(sha256Schema).length(6),
  topics: z.array(ledgerTopicSchema).length(6), audit: auditSchema
});
type Ledger = z.infer<typeof ledgerSchema>;
const articleInclude = { externalSources: { orderBy: { id: "asc" as const } }, tagLinks: { orderBy: { id: "asc" as const } } };
type Article = Prisma.NewsArticleGetPayload<{ include: typeof articleInclude }>;
type History = { articles: Article[]; staged: Ledger[]; published: Set<string> };

export class AiNewsBatchError extends Error {
  constructor(readonly code: string) { super(code); this.name = "AiNewsBatchError"; }
}
function fail(code: string): never { throw new AiNewsBatchError(code); }

// Ignore live counters and timestamps, but bind every editorial field and relation.
function contentDigest(article: Article) {
  const ignored = new Set(["viewCount", "likeCount", "favoriteCount", "updatedAt", "createdAt", "status", "publishedAt"]);
  const stable: Record<string, unknown> = Object.fromEntries(Object.entries(article).filter(([key]) => !ignored.has(key)));
  stable.externalSources = (article.externalSources ?? []).map(source => ({
    title: source.title, url: source.url, sourceType: source.sourceType, description: source.description, sortOrder: source.sortOrder
  })).sort((a, b) => digest(a).localeCompare(digest(b)));
  stable.tagLinks = (article.tagLinks ?? []).map(link => link.tagId).sort();
  return digest(stable);
}

async function history(tx: AiNewsImportTransaction): Promise<History> {
  const articles = await tx.newsArticle.findMany({ orderBy: { id: "asc" }, include: articleInclude });
  const logs = await tx.adminAuditLog.findMany({ where: { targetType, action: { in: [stageAction, publishAction] } }, orderBy: { createdAt: "asc" } });
  const staged: Ledger[] = [];
  const published = new Set<string>();
  for (const log of logs) {
    const entry = ledgerSchema.safeParse(log.metadata);
    if (!entry.success || log.targetId !== entry.data.runSlot) fail("BATCH_LEDGER_INVALID");
    if (log.action === stageAction) staged.push(entry.data);
    if (log.action === publishAction) published.add(entry.data.runSlot);
  }
  if (new Set(staged.map(entry => entry.runSlot)).size !== staged.length) fail("BATCH_LEDGER_CONFLICT");
  return { articles, staged, published };
}

function snapshot(data: History, now: Date, exclude?: Ledger): BatchSnapshot {
  const owned = new Set(exclude?.articleIds ?? []);
  const articles = data.articles.filter(article => !owned.has(article.id));
  const otherBatches = data.staged.filter(batch => batch.runSlot !== exclude?.runSlot);
  const events = otherBatches.flatMap(batch => batch.topics.map(topic => topic.eventKey)).sort();
  const rows = articles.map(article => ({ id: article.id, title: article.title, englishTitle: article.englishTitle,
    summary: article.summary, englishSummary: article.englishSummary, keyTakeaways: article.keyTakeaways, englishKeyTakeaways: article.englishKeyTakeaways,
    status: article.status, canonicalSlug: getCanonicalAiNewsSlug(article), coverImage: article.coverImage,
    sourceUrls: (article.externalSources ?? []).map(source => source.url), contentDigest: contentDigest(article) }));
  return { digest: digest({ articles: rows, events }), capturedAt: now.toISOString(), complete: true, total: rows.length, articles: rows, events };
}

function validateAutomatedAudit(audit: BatchAudit, manifestDigest: string, current: BatchSnapshot, validatorSha256: string | undefined, now: Date) {
  if (audit.manifestDigest !== manifestDigest) fail("AUDIT_DIGEST_MISMATCH");
  if (audit.snapshotDigest !== current.digest) fail("SNAPSHOT_CHANGED");
  if (validatorSha256 && audit.validatorSha256 !== validatorSha256) fail("VALIDATOR_VERSION_MISMATCH");
  const age = now.getTime() - Date.parse(audit.auditedAt);
  if (age < -300_000 || age > 86_400_000) fail("AUDIT_EXPIRED");
}

function checkEvidenceDates(topics: Ledger["topics"], now: Date) {
  for (const topic of topics) {
    for (const evidence of topic.sourceEvidence) {
      if (Date.parse(evidence.checkedAt) > now.getTime() + 300_000) fail("SOURCE_AUDIT_IN_FUTURE");
    }
    if (topic.kind === "FRESH_EVENT") {
      const primary = topic.sourceEvidence.find(source => sourceFingerprint(source.url) === sourceFingerprint(topic.primarySourceUrl));
      const age = now.getTime() - Date.parse(primary?.publishedAt ?? "");
      if (!Number.isFinite(age) || age < -300_000 || age > 7 * 86_400_000) fail("FRESH_EVENT_OUTSIDE_WINDOW");
    }
  }
}

function titleFingerprint(title: string | null | undefined) {
  return (title ?? "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/[\p{P}\p{Z}\s]/gu, "");
}

function deduplicate(topics: Ledger["topics"], candidates: Array<Pick<Article, "title" | "englishTitle" | "coverImage" | "externalSources">>, data: History, exclude?: Ledger) {
  const owned = new Set(exclude?.articleIds ?? []);
  const previous = data.articles.filter(article => !owned.has(article.id));
  const previousEvents = new Set(data.staged.filter(batch => batch.runSlot !== exclude?.runSlot).flatMap(batch => batch.topics.map(topic => topic.eventKey)));
  const sources = new Set(previous.flatMap(article => (article.externalSources ?? []).map(source => sourceFingerprint(source.url))));
  const titles = new Set(previous.flatMap(article => [titleFingerprint(article.title), titleFingerprint(article.englishTitle)]).filter(Boolean));
  const covers = new Set(previous.map(article => getAiNewsCoverImageFingerprint(article.coverImage)).filter(Boolean));
  for (let index = 0; index < topics.length; index++) {
    const topic = topics[index]; const candidate = candidates[index];
    if (previousEvents.has(topic.eventKey)) fail("DUPLICATE_EVENT");
    previousEvents.add(topic.eventKey);
    const primary = sourceFingerprint(topic.primarySourceUrl);
    if (sources.has(primary)) fail("DUPLICATE_SOURCE");
    sources.add(primary);
    for (const title of [titleFingerprint(candidate.title), titleFingerprint(candidate.englishTitle)].filter(Boolean)) {
      if (titles.has(title)) fail("DUPLICATE_TITLE");
      titles.add(title);
    }
    const cover = getAiNewsCoverImageFingerprint(candidate.coverImage);
    if (covers.has(cover)) fail("DUPLICATE_COVER");
    covers.add(cover);
  }
}

function ownedArticles(data: History, ledger: Ledger) {
  if (new Set(ledger.articleIds).size !== 6) fail("BATCH_OWNERSHIP_INVALID");
  return ledger.articleIds.map((id, index) => {
    const article = data.articles.find(row => row.id === id);
    if (!article) fail("BATCH_ARTICLE_MISSING");
    if (contentDigest(article) !== ledger.contentDigests[index]) fail("STAGED_CONTENT_CHANGED");
    return article;
  });
}

function assertCanonicalRoutes(articles: Article[], previous: Article[]) {
  const paths = new Set(previous.flatMap(article => [article.slug, getCanonicalAiNewsSlug(article)]));
  for (const article of articles) {
    const routes = new Set([article.slug, getCanonicalAiNewsSlug(article)]);
    for (const route of routes) if (paths.has(route)) fail("CANONICAL_COLLISION");
    routes.forEach(route => paths.add(route));
  }
}

function response(ledger: Ledger, articles: Article[], published: boolean): BatchResponse {
  const records: BatchRecord[] = articles.map(article => {
    const canonicalSlug = getCanonicalAiNewsSlug(article);
    return { articleId: article.id, canonicalSlug, status: article.status,
      publicPaths: published ? [`/ai-news/${canonicalSlug}`, `/en/ai-news/${canonicalSlug}`] : [],
      title: article.title, englishTitle: article.englishTitle!, coverImage: article.coverImage!,
      sourceUrls: article.externalSources.map(source => source.url) };
  });
  return { ok: true, state: published ? "PUBLISHED_AWAITING_PUBLIC_VERIFICATION" : "STAGED", runSlot: ledger.runSlot,
    manifestDigest: ledger.manifestDigest, records,
    counts: { topicPackageCount: 6, localizedHtmlCount: 12, cmsRecordCount: articles.length, localizedPublicPageCount: 0 } };
}

async function audit(tx: AiNewsImportTransaction, ledger: Ledger, action: string) {
  await tx.adminAuditLog.create({ data: { action, targetType, targetId: ledger.runSlot,
    summary: action === stageAction ? "Staged six bilingual AI news drafts." : "Promoted six owned bilingual AI news drafts.",
    metadata: JSON.parse(JSON.stringify(ledger)) as Prisma.InputJsonValue } });
}

export async function handleAiNewsBatch(raw: unknown, options: { validatorSha256?: string } = {}): Promise<BatchResponse> {
  const request = batchRequestSchema.parse(raw);
  // Parse before opening a transaction; no source fetch occurs in this service.
  if (request.operation === "stage" && request.audit.manifestDigest !== batchDigest(request.batch)) fail("AUDIT_DIGEST_MISMATCH");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const now = new Date(); const data = await history(tx);
        if (request.operation === "snapshot") {
          const exclude = request.excludeRunSlot ? data.staged.find(batch => batch.runSlot === request.excludeRunSlot) : undefined;
          return { ok: true, state: "SNAPSHOT", snapshot: snapshot(data, now, exclude) };
        }
        const runSlot = request.operation === "stage" ? request.batch.runSlot : request.runSlot;
        const existing = data.staged.find(batch => batch.runSlot === runSlot);
        if (existing && existing.manifestDigest !== request.audit.manifestDigest) fail("RUN_SLOT_CONFLICT");
        if (existing) {
          if (options.validatorSha256 && existing.validatorSha256 !== options.validatorSha256) fail("VALIDATOR_VERSION_MISMATCH");
          const articles = ownedArticles(data, existing);
          const published = data.published.has(runSlot);
          if (articles.some(article => article.status !== (published ? "published" : "draft"))) fail("BATCH_STATUS_CHANGED");
          if (published || request.operation === "stage") return response(existing, articles, published);
          validateAutomatedAudit(request.audit, existing.manifestDigest, snapshot(data, now, existing), options.validatorSha256, now);
          checkEvidenceDates(existing.topics, now);
          deduplicate(existing.topics, articles, data, existing);
          assertCanonicalRoutes(articles, data.articles.filter(article => !existing.articleIds.includes(article.id)));
          const updated = await tx.newsArticle.updateMany({ where: { id: { in: existing.articleIds }, status: "draft" }, data: { status: "published", publishedAt: now } });
          if (updated.count !== 6) fail("INCOMPLETE_PROMOTION");
          await audit(tx, { ...existing, audit: request.audit }, publishAction);
          return response(existing, articles.map(article => ({ ...article, status: "published", publishedAt: now })), true);
        }
        if (request.operation !== "stage") fail("BATCH_NOT_STAGED");
        const batch: AiNewsBatch = request.batch;
        if (options.validatorSha256 && batch.validatorSha256 !== options.validatorSha256) fail("VALIDATOR_VERSION_MISMATCH");
        const manifestDigest = batchDigest(batch);
        validateAutomatedAudit(request.audit, manifestDigest, snapshot(data, now), options.validatorSha256, now);
        checkEvidenceDates(batch.topics, now);
        deduplicate(batch.topics, batch.topics.map(topic => ({ ...topic.article,
          externalSources: topic.article.externalSources as Article["externalSources"] })), data);
        const articleIds: string[] = [];
        for (const topic of batch.topics) {
          const article = await importAiNewsArticleInTransaction(tx, { publishMode: "draft", importBatchId: runSlot, article: topic.article }, now);
          articleIds.push(article.id);
        }
        const saved = await tx.newsArticle.findMany({ orderBy: { id: "asc" }, include: articleInclude });
        const articles = articleIds.map(id => saved.find(article => article.id === id) ?? fail("INCOMPLETE_STAGE"));
        if (new Set(articleIds).size !== 6) fail("INCOMPLETE_STAGE");
        assertCanonicalRoutes(articles, data.articles);
        for (const article of articles) {
          if (!isEnglishNewsArticleIndexable(article)) fail("ENGLISH_PAGE_NOT_INDEXABLE");
        }
        const ledger: Ledger = { runSlot, manifestDigest, validatorSha256: batch.validatorSha256, articleIds,
          contentDigests: articles.map(contentDigest), topics: batch.topics.map(topic => ({ kind: topic.kind, eventKey: topic.eventKey,
            primarySourceUrl: topic.primarySourceUrl, sourceEvidence: topic.sourceEvidence })), audit: request.audit };
        await audit(tx, ledger, stageAction);
        return response(ledger, articles, false);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 30000 });
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && (error.code === "P2034" || error.code === "P2002")) || attempt === 2) throw error;
    }
  }
  return fail("BATCH_CONCURRENCY_RETRY_EXHAUSTED");
}
