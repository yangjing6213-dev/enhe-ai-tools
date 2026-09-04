import { createHash } from "node:crypto";
import { z } from "zod";
import { aiNewsImportArticleSchema } from "@/lib/ai-news-import-schema";
import { isEnglishNewsArticleIndexable } from "@/lib/ai-news";

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const nonempty = (max: number) => z.string().trim().min(1).max(max);
const httpsUrl = z.string().url().max(2000).refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "HTTPS URL without credentials required");

export function digest(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") {
      return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normalize(v)]));
    }
    return input;
  };
  return createHash("sha256").update(JSON.stringify(normalize(value))).digest("hex");
}

export function sourceFingerprint(value: string) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.replace(/^www\./, "");
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|ref)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  return url.toString();
}

const bilingualArticleSchema = aiNewsImportArticleSchema.extend({
  subtitle: nonempty(220), englishTitle: nonempty(180), englishSubtitle: nonempty(220),
  englishSummary: nonempty(1200), englishContent: nonempty(50000),
  seoTitle: nonempty(220), seoDescription: nonempty(500), seoKeywords: nonempty(500),
  englishSeoTitle: nonempty(220), englishSeoDescription: nonempty(500), englishKeywords: nonempty(500),
  keyTakeaways: z.array(nonempty(220)).min(1).max(8), englishKeyTakeaways: z.array(nonempty(220)).min(1).max(8),
  impactNotes: nonempty(2000), englishImpactNotes: nonempty(2000), conclusion: nonempty(2000), englishConclusion: nonempty(2000),
  coverImage: httpsUrl,
  canonicalUrl: z.never().optional(),
  tags: z.array(nonempty(80)).min(1).max(20)
}).strict().superRefine((article, context) => {
  const fail = (message: string) => context.addIssue({ code: "custom", message });
  const chineseSummaryLength = (article.summary.match(/[\u3400-\u9fff]/g) ?? []).length;
  const englishSummaryLength = (article.englishSummary.match(/\b[\w'-]+\b/g) ?? []).length;
  if (chineseSummaryLength < 100 || chineseSummaryLength > 160 || englishSummaryLength < 100 || englishSummaryLength > 160) fail("SUMMARY_LENGTH_INVALID");
  if (!isEnglishNewsArticleIndexable(article)) fail("ENGLISH_PAGE_NOT_INDEXABLE");
  if (!/AI\s*辅助/.test(article.content) || !/AI[- ](?:assisted|generated)/i.test(article.englishContent)) fail("AI_DISCLOSURE_REQUIRED");
  for (const content of [article.content, article.englishContent]) {
    // Public rendering accepts Markdown. V2 does not admit raw executable markup.
    if (/<\/?(?:script|style|iframe|object|embed|form|html)\b|<[a-z][^>]*\s(?:on\w+|style)\s*=|\]\(\s*(?:javascript|data|vbscript):/i.test(content)) {
      context.addIssue({ code: "custom", message: "UNSAFE_CONTENT" });
    }
  }
});

export const topicSchema = z.object({
  kind: z.enum(["FRESH_EVENT", "DURABLE_TASK"]),
  eventKey: nonempty(200).regex(/^[a-z0-9][a-z0-9:._/-]*$/),
  primarySourceUrl: httpsUrl,
  sourceEvidence: z.array(z.object({ url: httpsUrl, sha256: sha256Schema, checkedAt: z.string().datetime(), publishedAt: z.string().datetime().optional() }).strict()).min(1).max(12),
  mediaEvidence: z.array(z.object({ url: httpsUrl, license: z.enum(["Unsplash", "owned", "licensed"]), evidenceUrl: httpsUrl }).strict()).min(1).max(20),
  html: z.array(z.object({ locale: z.enum(["zh", "en"]), sha256: sha256Schema }).strict()).length(2),
  article: bilingualArticleSchema
}).strict().superRefine((topic, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (new Set(topic.html.map(html => html.locale)).size !== 2) fail("TWO_LOCALES_REQUIRED");
  const sources = new Set(topic.article.externalSources.map(source => sourceFingerprint(source.url)));
  if (!sources.has(sourceFingerprint(topic.primarySourceUrl))) fail("PRIMARY_SOURCE_MISSING");
  for (const source of sources) {
    if (!topic.sourceEvidence.some(evidence => sourceFingerprint(evidence.url) === source)) fail("SOURCE_EVIDENCE_MISSING");
  }
  if (topic.kind === "FRESH_EVENT" && !topic.sourceEvidence.find(e => sourceFingerprint(e.url) === sourceFingerprint(topic.primarySourceUrl))?.publishedAt) fail("EVENT_DATE_MISSING");
  const media = [topic.article.coverImage, topic.article.videoUrl,
    ...[...`${topic.article.content}\n${topic.article.englishContent}`.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)/g)].map(m => m[1])].filter(Boolean);
  for (const url of media) {
    if (!topic.mediaEvidence.some(e => e.url === url)) fail("MEDIA_RIGHTS_MISSING");
  }
  for (const evidence of topic.mediaEvidence) {
    if (evidence.license === "Unsplash" && (new URL(evidence.url).hostname !== "images.unsplash.com" || !["unsplash.com", "www.unsplash.com"].includes(new URL(evidence.evidenceUrl).hostname))) fail("UNSPLASH_PROVENANCE_INVALID");
  }
});

export const batchSchema = z.object({
  runSlot: nonempty(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9:._+/-]*$/),
  validatorSha256: sha256Schema,
  topics: z.array(topicSchema).length(6)
}).strict().superRefine((batch, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (batch.topics.filter(t => t.kind === "FRESH_EVENT").length !== 5 || batch.topics.filter(t => t.kind === "DURABLE_TASK").length !== 1) fail("EXACT_5_PLUS_1_REQUIRED");
  if (new Set(batch.topics.map(t => t.eventKey)).size !== 6) fail("DUPLICATE_EVENT");
  if (new Set(batch.topics.map(t => sourceFingerprint(t.primarySourceUrl))).size !== 6) fail("DUPLICATE_SOURCE");
  if (new Set(batch.topics.flatMap(t => t.html.map(h => h.sha256))).size !== 12) fail("TWELVE_DISTINCT_HTML_REQUIRED");
});

/**
 * Machine generated audit attestation for a V2 batch.
 *
 * This replaces the former human reviewer payload.  The attestation is
 * intentionally bound to the manifest, snapshot and validator identity so a
 * caller cannot reuse an audit after any of those inputs change.  The server
 * still re-runs its own source, freshness, deduplication and canonical checks;
 * these flags only record the local checks that produced the request.
 */
export const auditSchema = z.object({
  mode: z.literal("automated"), auditor: z.literal("enhe-ai-news-v2"), auditedAt: z.string().datetime(),
  manifestDigest: sha256Schema, snapshotDigest: sha256Schema, validatorSha256: sha256Schema,
  checks: z.object({
    sourceEvidence: z.literal(true), mediaRights: z.literal(true), freshness: z.literal(true),
    htmlValidation: z.literal(true), safety: z.literal(true), aiDisclosure: z.literal(true),
    bilingualParity: z.literal(true), deduplication: z.literal(true), canonicalSafety: z.literal(true)
  }).strict()
}).strict();

export const batchRequestSchema = z.discriminatedUnion("operation", [
  z.object({ format: z.literal("batch-v2"), operation: z.literal("snapshot"), excludeRunSlot: nonempty(120).optional() }).strict(),
  z.object({ format: z.literal("batch-v2"), operation: z.literal("stage"), batch: batchSchema, audit: auditSchema }).strict(),
  z.object({ format: z.literal("batch-v2"), operation: z.literal("promote"), runSlot: nonempty(120), audit: auditSchema }).strict()
]);

export type AiNewsBatch = z.infer<typeof batchSchema>;
export type BatchAudit = z.infer<typeof auditSchema>;
export const batchDigest = (batch: AiNewsBatch) => digest(batch);
export type BatchRecord = { articleId: string; canonicalSlug: string; status: string; publicPaths: string[]; title: string; englishTitle: string; coverImage: string; sourceUrls: string[] };
export type BatchSnapshot = { digest: string; capturedAt: string; complete: true; total: number; articles: Array<Record<string, unknown>>; events: string[] };
export type BatchResponse = { ok: true; state: "SNAPSHOT" | "STAGED" | "PUBLISHED_AWAITING_PUBLIC_VERIFICATION"; runSlot?: string; manifestDigest?: string;
  records?: BatchRecord[]; snapshot?: BatchSnapshot;
  counts?: { topicPackageCount: number; localizedHtmlCount: number; cmsRecordCount: number; localizedPublicPageCount: number } };
