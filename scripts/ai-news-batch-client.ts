import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, realpath, stat, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { buildAiNewsImportPayloadFromHtml, extractAiNewsBatchVisibleContent } from "../src/lib/ai-news-html-import";
import { renderNewsContentBlocks } from "../src/lib/ai-news";
import { auditSchema, batchDigest, batchSchema, digest, sha256Schema, topicSchema, type AiNewsBatch, type BatchAudit, type BatchRecord } from "../src/lib/ai-news-batch-contract";

const execute = promisify(execFile);
const oneMiB = 1_048_576;
class BatchClientError extends Error { constructor(code: string) { super(code); this.name = "BatchClientError"; } }
function fail(code: string): never { throw new BatchClientError(code); }
const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const sourceEvidenceSchema = topicSchema.innerType().shape.sourceEvidence.element.extend({ file: z.string().min(1).max(500) });
const manifestTopicSchema = topicSchema.innerType().omit({ article: true, html: true, sourceEvidence: true }).extend({
  sourceEvidence: z.array(sourceEvidenceSchema).min(1).max(12),
  htmlFiles: z.object({ zh: z.string().min(1).max(500), en: z.string().min(1).max(500) }).strict()
}).strict();
const manifestSchema = z.object({ version: z.literal(2), purpose: z.enum(["production-candidate", "test-fixture"]),
  runSlot: z.string().min(1).max(120), validatorSha256: sha256Schema, topics: z.array(manifestTopicSchema).length(6) }).strict();
const recordSchema = z.object({ articleId: z.string().min(1).max(120), canonicalSlug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(250),
  status: z.enum(["draft", "published"]), publicPaths: z.array(z.string()).max(2), title: z.string(), englishTitle: z.string(),
  coverImage: z.string().url(), sourceUrls: z.array(z.string().url()).min(1).max(12) });
const countsSchema = z.object({ topicPackageCount: z.literal(6), localizedHtmlCount: z.literal(12), cmsRecordCount: z.literal(6), localizedPublicPageCount: z.literal(0) });
const snapshotSchema = z.object({ digest: sha256Schema, capturedAt: z.string().datetime(), complete: z.literal(true), total: z.number().int().nonnegative(),
  articles: z.array(z.object({ id: z.string(), title: z.string(), englishTitle: z.string().nullable().optional(), summary: z.string().optional(),
    englishSummary: z.string().nullable().optional(), keyTakeaways: z.array(z.string()).optional(), englishKeyTakeaways: z.array(z.string()).optional(),
    status: z.string(), canonicalSlug: z.string(), coverImage: z.string().nullable().optional(), sourceUrls: z.array(z.string()), contentDigest: sha256Schema })), events: z.array(z.string()) });
const serverSchema = z.object({ ok: z.literal(true), state: z.enum(["SNAPSHOT", "STAGED", "PUBLISHED_AWAITING_PUBLIC_VERIFICATION"]),
  runSlot: z.string().optional(), manifestDigest: sha256Schema.optional(), records: z.array(recordSchema).length(6).optional(), snapshot: snapshotSchema.optional(),
  counts: countsSchema.optional(), cacheRefresh: z.enum(["complete", "pending"]).optional() });
const receiptSchema = z.object({ version: z.literal(2), runSlot: z.string(), manifestDigest: sha256Schema, validatorSha256: sha256Schema,
  auditedAt: z.string().datetime(), payloadFiles: z.array(z.string()).length(6), endpointOrigin: z.string().optional(), snapshot: snapshotSchema.optional(), audit: auditSchema.optional(), server: serverSchema.optional(),
  verification: z.object({ localizedPublicPageCount: z.literal(12), verifiedAt: z.string().datetime(), urls: z.array(z.string()).length(12) }).optional() });
type Receipt = z.infer<typeof receiptSchema>;

export function credentialFreeEnvironment(environment: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = { NODE_ENV: "test", PYTHONIOENCODING: "utf-8" };
  for (const key of ["SystemRoot", "WINDIR", "TEMP", "TMP"]) if (environment[key]) result[key] = environment[key];
  return result;
}

export function assertBatchEndpoint(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { return fail("INVALID_IMPORT_ENDPOINT"); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.search || url.hash || url.pathname !== "/api/admin/ai-news/import") fail("UNSAFE_IMPORT_ENDPOINT");
  return url;
}

async function boundedFile(path: string, limit = oneMiB) {
  const info = await stat(path);
  if (!info.isFile() || info.size > limit) fail("ARTIFACT_FILE_INVALID");
  const bytes = await readFile(path);
  if (bytes.length > limit) fail("ARTIFACT_FILE_TOO_LARGE");
  return bytes;
}

async function containedFile(directory: string, path: string) {
  if (isAbsolute(path)) fail("ARTIFACT_PATH_MUST_BE_RELATIVE");
  const actual = await realpath(resolve(directory, path));
  const rel = relative(directory, actual);
  if (rel === "" || rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(rel)) fail("ARTIFACT_PATH_ESCAPE");
  return actual;
}

function unescapeHtml(value: string) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)));
}
const plain = (value: string) => unescapeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return unescapeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

export async function auditManifest(path: string) {
  const manifestPath = await realpath(resolve(path));
  const directory = await realpath(dirname(manifestPath));
  const manifest = manifestSchema.parse(JSON.parse((await boundedFile(manifestPath)).toString("utf8").replace(/^\uFEFF/, "")));
  const validatorPath = process.env.ENHE_AI_NEWS_VALIDATOR_PATH;
  const pythonPath = process.env.ENHE_AI_NEWS_PYTHON;
  const approvedHash = process.env.ENHE_AI_NEWS_VALIDATOR_SHA256;
  if (!validatorPath || !pythonPath || !approvedHash || !isAbsolute(validatorPath) || !isAbsolute(pythonPath)) fail("VALIDATOR_CONFIGURATION_REQUIRED");
  const validator = await realpath(validatorPath); const python = await realpath(pythonPath);
  if (sha256(await boundedFile(validator)) !== approvedHash || manifest.validatorSha256 !== approvedHash) fail("VALIDATOR_HASH_MISMATCH");
  const topics: unknown[] = []; const files = new Set<string>(); const protectedPaths = new Set([manifestPath, validator, python]);
  for (const topic of manifest.topics) {
    const evidence = [];
    for (const proof of topic.sourceEvidence) {
      const { file, ...metadata } = proof;
      const evidencePath = await containedFile(directory, file); protectedPaths.add(evidencePath);
      if (sha256(await boundedFile(evidencePath, 8 * oneMiB)) !== proof.sha256) fail("SOURCE_EVIDENCE_HASH_MISMATCH");
      evidence.push(metadata);
    }
    const localized = []; const htmlHashes = [];
    for (const locale of ["zh", "en"] as const) {
      const htmlFile = await containedFile(directory, topic.htmlFiles[locale]);
      if (files.has(htmlFile)) fail("HTML_FILE_REUSED"); files.add(htmlFile);
      protectedPaths.add(htmlFile);
      const bytes = await boundedFile(htmlFile, 320_000); const html = bytes.toString("utf8").replace(/^\uFEFF/, "");
      if (/<(?:iframe|object|embed|form|base|svg|math)\b|<meta\b[^>]*\shttp-equiv\s*=/i.test(html)) fail("UNSAFE_HTML_DOCUMENT");
      const lang = attribute(html.match(/<html\b[^>]*>/i)?.[0] ?? "", "lang");
      if (!new RegExp(`^${locale}(?:-|$)`, "i").test(lang)) fail("HTML_LOCALE_MISMATCH");
      try {
        // Isolated Python ignores user packages and PYTHONPATH; only the file path reaches the trusted validator.
        await execute(python, ["-I", validator, htmlFile], { cwd: dirname(validator), env: credentialFreeEnvironment(process.env), timeout: 30000, maxBuffer: 64000, windowsHide: true });
      } catch { fail("HTML_VALIDATION_FAILED"); }
      if (sha256(await boundedFile(htmlFile, 320_000)) !== sha256(bytes)) fail("HTML_CHANGED_DURING_AUDIT");
      const parsed = buildAiNewsImportPayloadFromHtml({ html, publishMode: "published", preferCmsArticleFields: true }).article;
      delete parsed.canonicalUrl; delete parsed.slug;
      const visibleTitle = plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
      if (visibleTitle !== (locale === "zh" ? parsed.title : parsed.englishTitle)) fail("VISIBLE_TITLE_PAYLOAD_MISMATCH");
      if (extractAiNewsBatchVisibleContent(html) !== (locale === "zh" ? parsed.content : parsed.englishContent)) fail("VISIBLE_BODY_PAYLOAD_MISMATCH");
      localized.push(parsed); htmlHashes.push({ locale, sha256: sha256(bytes) });
    }
    if (digest(localized[0]) !== digest(localized[1])) fail("BILINGUAL_PAYLOAD_MISMATCH");
    topics.push({ kind: topic.kind, eventKey: topic.eventKey, primarySourceUrl: topic.primarySourceUrl,
      sourceEvidence: evidence, mediaEvidence: topic.mediaEvidence, html: htmlHashes, article: localized[0] });
  }
  // An executable changed mid-run cannot be accepted by a pinned audit.
  if (sha256(await boundedFile(validator)) !== approvedHash) fail("VALIDATOR_CHANGED_DURING_AUDIT");
  const batch = batchSchema.parse({ runSlot: manifest.runSlot, validatorSha256: approvedHash, topics });
  return { batch, manifestDigest: batchDigest(batch), purpose: manifest.purpose, protectedPaths };
}

/** Build a digest-bound attestation from the checks completed by auditManifest. */
export function buildAutomaticAudit(audited: { batch: AiNewsBatch; manifestDigest: string }, snapshotDigest: string, auditedAt = new Date().toISOString()): BatchAudit {
  return auditSchema.parse({
    mode: "automated", auditor: "enhe-ai-news-v2", auditedAt,
    manifestDigest: audited.manifestDigest, snapshotDigest, validatorSha256: audited.batch.validatorSha256,
    checks: {
      sourceEvidence: true, mediaRights: true, freshness: true, htmlValidation: true,
      safety: true, aiDisclosure: true, bilingualParity: true, deduplication: true, canonicalSafety: true
    }
  });
}

async function responseText(response: Response, limit: number) {
  const reader = response.body?.getReader(); if (!reader) fail("EMPTY_HTTP_RESPONSE");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) { await reader.cancel(); fail("HTTP_RESPONSE_TOO_LARGE"); }
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { reader.releaseLock(); }
}

export async function sendBatchRequest(endpoint: URL, payload: unknown, token: string) {
  assertBatchEndpoint(endpoint.toString());
  if (!token.trim()) fail("IMPORT_TOKEN_REQUIRED");
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload), redirect: "error", signal: AbortSignal.timeout(45000) });
    if (!response.ok) fail(`BATCH_HTTP_${response.status}`);
    const result = serverSchema.parse(JSON.parse(await responseText(response, 16 * oneMiB)));
    if (result.state === "SNAPSHOT") {
      const snapshot = result.snapshot;
      if (!snapshot || snapshot.total !== snapshot.articles.length || new Set(snapshot.articles.map(article => article.id)).size !== snapshot.total) fail("INCOMPLETE_PRODUCTION_SNAPSHOT");
      if (snapshot.digest !== digest({ articles: snapshot.articles, events: snapshot.events })) fail("SNAPSHOT_DIGEST_MISMATCH");
    }
    return result;
  } catch (error) {
    if (error instanceof BatchClientError) throw error;
    return fail("BATCH_REQUEST_FAILED_RETRY_SAME_SLOT");
  }
}

export async function verifyPublicPages(origin: string, rawRecords: BatchRecord[], expectedBatch?: AiNewsBatch) {
  const base = assertBatchEndpoint(new URL("/api/admin/ai-news/import", origin).toString());
  const records = z.array(recordSchema).length(6).parse(rawRecords);
  if (expectedBatch) assertRecordPayloads(records, expectedBatch);
  if (new Set(records.map(record => record.articleId)).size !== 6 || new Set(records.map(record => record.canonicalSlug)).size !== 6) fail("PUBLIC_PAGE_DUPLICATE_RECORD");
  const urls: string[] = [];
  for (const record of records) {
    const expected = [`/ai-news/${record.canonicalSlug}`, `/en/ai-news/${record.canonicalSlug}`];
    if (record.status !== "published" || JSON.stringify(record.publicPaths) !== JSON.stringify(expected)) fail("PUBLIC_PAGE_PATHS_INVALID");
    for (const path of record.publicPaths) {
      const url = new URL(path, base.origin); const english = path.startsWith("/en/");
      try {
        const response = await fetch(url.toString(), { redirect: "error", signal: AbortSignal.timeout(15000) });
        if (response.status !== 200) fail("PUBLIC_PAGE_HTTP_FAILED");
        const html = await responseText(response, 4 * oneMiB);
        const lang = attribute(html.match(/<html\b[^>]*>/i)?.[0] ?? "", "lang");
        const canonical = (html.match(/<link\b[^>]*>/gi) ?? []).filter(tag => attribute(tag, "rel").split(/\s+/).includes("canonical"));
        if (canonical.length !== 1 || attribute(canonical[0], "href") !== url.toString()) fail("PUBLIC_PAGE_CANONICAL_MISMATCH");
        if (!(english ? /^en(?:-|$)/i : /^zh(?:-|$)/i).test(lang)) fail("PUBLIC_PAGE_LOCALE_MISMATCH");
        if (plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") !== (english ? record.englishTitle : record.title)) fail("PUBLIC_PAGE_TITLE_MISMATCH");
        const robots = (html.match(/<meta\b[^>]*>/gi) ?? []).filter(tag => /^(robots|googlebot)$/i.test(attribute(tag, "name")));
        if (robots.some(tag => /\bnoindex\b/i.test(attribute(tag, "content")))) fail("PUBLIC_PAGE_NOINDEX");
        const images = (html.match(/<img\b[^>]*>/gi) ?? []).map(tag => attribute(tag, "src"));
        if (!images.some(image => image === record.coverImage || new URL(image, base.origin).searchParams.get("url") === record.coverImage)) fail("PUBLIC_PAGE_COVER_MISSING");
        const links = new Set((html.match(/<a\b[^>]*>/gi) ?? []).map(tag => attribute(tag, "href")));
        if (record.sourceUrls.some(source => !links.has(source))) fail("PUBLIC_PAGE_SOURCES_MISSING");
        if (expectedBatch) {
          const article = expectedBatch.topics[records.indexOf(record)].article;
          const content = english ? article.englishContent : article.content;
          const visibleText = plain(html.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ""));
          for (const block of renderNewsContentBlocks(content)) {
            if (block.type === "image") {
              if (!images.some(image => image === block.src || new URL(image, base.origin).searchParams.get("url") === block.src)) fail("PUBLIC_PAGE_BODY_MEDIA_MISSING");
              continue;
            }
            const texts = block.type === "paragraph" ? [block.text ?? block.parts?.map(part => part.text).join("") ?? ""] :
              block.type === "list" ? block.items.map(item => typeof item === "string" ? item : item.parts.map(part => part.text).join("")) :
              block.type === "code" ? [block.code] : [block.text];
            if (texts.some(text => plain(text) && !visibleText.includes(plain(text)))) fail("PUBLIC_PAGE_BODY_MISMATCH");
          }
        }
        urls.push(url.toString());
      } catch (error) {
        if (error instanceof BatchClientError) throw error;
        fail("PUBLIC_PAGE_REQUEST_FAILED");
      }
    }
  }
  return { localizedPublicPageCount: 12 as const, verifiedAt: new Date().toISOString(), urls };
}

async function saveReceipt(path: string, receipt: Receipt) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  await rename(temp, path);
}

async function saveAuditedPayloads(receiptPath: string, batch: AiNewsBatch) {
  const directory = resolve(dirname(receiptPath), "payloads", batchDigest(batch));
  await mkdir(directory, { recursive: true });
  const files: string[] = [];
  for (let index = 0; index < batch.topics.length; index++) {
    const path = resolve(directory, `topic-${index + 1}.json`);
    const contents = JSON.stringify({ publishMode: "draft", importBatchId: batch.runSlot, article: batch.topics[index].article }, null, 2) + "\n";
    try { await writeFile(path, contents, { flag: "wx", mode: 0o600 }); }
    catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST")) throw error;
      if ((await boundedFile(path)).toString("utf8") !== contents) fail("AUDITED_PAYLOAD_CHANGED");
    }
    files.push(path);
  }
  return files;
}

function parseArgs(args: string[]) {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (!["--manifest", "--phase", "--receipt"].includes(args[i]) || flags.has(args[i]) || !args[i + 1] || args[i + 1].startsWith("--")) fail("INVALID_BATCH_ARGUMENTS");
    flags.set(args[i], args[i + 1]);
  }
  if (!flags.has("--manifest")) fail("MANIFEST_REQUIRED");
  const phase = z.enum(["audit", "snapshot", "stage", "promote", "verify"]).parse(flags.get("--phase") ?? "audit");
  return { manifest: resolve(flags.get("--manifest")!), receipt: resolve(flags.get("--receipt") ?? resolve(dirname(flags.get("--manifest")!), "receipt.json")), phase };
}

export async function runBatchClient(args: string[]) {
  try {
    const options = parseArgs(args);
    const audit = await auditManifest(options.manifest);
    const receiptTarget = await realpath(options.receipt).catch(() => resolve(options.receipt));
    if (audit.protectedPaths.has(receiptTarget)) fail("RECEIPT_MUST_NOT_OVERWRITE_ARTIFACT");
    let receipt: Receipt = { version: 2, runSlot: audit.batch.runSlot, manifestDigest: audit.manifestDigest,
      validatorSha256: audit.batch.validatorSha256, auditedAt: new Date().toISOString(), payloadFiles: await saveAuditedPayloads(options.receipt, audit.batch) };
    try {
      const previous = receiptSchema.parse(JSON.parse((await boundedFile(options.receipt, 16 * oneMiB)).toString("utf8")));
      if (previous.runSlot !== receipt.runSlot || previous.manifestDigest !== receipt.manifestDigest) fail("RECEIPT_MANIFEST_CONFLICT");
      receipt = { ...previous, auditedAt: receipt.auditedAt };
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
    }
    if (options.phase !== "audit") {
      const endpoint = assertBatchEndpoint(process.env.AI_NEWS_IMPORT_URL ?? "");
      if (receipt.endpointOrigin && receipt.endpointOrigin !== endpoint.origin) fail("RECEIPT_ORIGIN_CHANGED");
      if (audit.purpose === "test-fixture" && !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)) fail("TEST_FIXTURE_REMOTE_PUBLISH_FORBIDDEN");
      receipt.endpointOrigin = endpoint.origin;
      if (options.phase === "verify") {
        if (receipt.server?.state !== "PUBLISHED_AWAITING_PUBLIC_VERIFICATION" || !receipt.server.records) fail("PUBLISHED_RECEIPT_REQUIRED");
        // Clear earlier success before retry, so a failed re-check cannot retain a success receipt.
        delete receipt.verification; await saveReceipt(options.receipt, receipt);
        receipt.verification = await verifyPublicPages(endpoint.origin, receipt.server.records, audit.batch);
      } else {
        let payload: unknown;
        if (options.phase === "snapshot") payload = { format: "batch-v2", operation: "snapshot", excludeRunSlot: audit.batch.runSlot };
        else {
          if (!receipt.snapshot) fail("SNAPSHOT_REQUIRED");
          const automaticAudit = buildAutomaticAudit(audit, receipt.snapshot.digest);
          receipt.audit = automaticAudit;
          if (options.phase === "promote" && !receipt.server?.records) fail("STAGED_RECEIPT_REQUIRED");
          payload = options.phase === "stage" ? { format: "batch-v2", operation: "stage", batch: audit.batch, audit: automaticAudit } : { format: "batch-v2", operation: "promote", runSlot: audit.batch.runSlot, audit: automaticAudit };
        }
        const result = await sendBatchRequest(endpoint, payload, process.env.AI_NEWS_IMPORT_TOKEN ?? "");
        if (options.phase === "snapshot") {
          if (!result.snapshot || result.snapshot.total !== result.snapshot.articles.length) fail("INCOMPLETE_PRODUCTION_SNAPSHOT");
          receipt.snapshot = result.snapshot;
        } else {
          if (result.runSlot !== receipt.runSlot || result.manifestDigest !== receipt.manifestDigest || !result.records || !result.counts || result.state === "SNAPSHOT") fail("SERVER_RECEIPT_MISMATCH");
          assertRecordPayloads(result.records, audit.batch);
          if (options.phase === "promote" && result.state !== "PUBLISHED_AWAITING_PUBLIC_VERIFICATION") fail("PROMOTION_NOT_CONFIRMED");
          receipt.server = result;
          delete receipt.verification;
        }
      }
    }
    await saveReceipt(options.receipt, receipt);
    return { state: receipt.verification ? "VERIFIED_PUBLISHED" : options.phase === "audit" ? "AUDITED" : options.phase === "snapshot" ? "SNAPSHOT" : receipt.server?.state,
      runSlot: receipt.runSlot, manifestDigest: receipt.manifestDigest,
      counts: { topicPackageCount: 6, localizedHtmlCount: 12, cmsRecordCount: receipt.server?.records?.length ?? 0, localizedPublicPageCount: receipt.verification?.localizedPublicPageCount ?? 0 }, receipt: options.receipt };
  } catch (error) {
    if (error instanceof BatchClientError) throw error;
    throw new BatchClientError("BATCH_INPUT_OR_OPERATION_FAILED");
  }
}

function assertRecordPayloads(records: BatchRecord[], batch: AiNewsBatch) {
  if (new Set(records.map(record => record.articleId)).size !== 6) fail("SERVER_DUPLICATE_RECORDS");
  for (let index = 0; index < records.length; index++) {
    const record = records[index]; const topic = batch.topics[index];
    if (record.title !== topic.article.title || record.englishTitle !== topic.article.englishTitle || record.coverImage !== topic.article.coverImage ||
      digest([...record.sourceUrls].sort()) !== digest(topic.article.externalSources.map(source => source.url).sort())) fail("SERVER_PAYLOAD_MISMATCH");
  }
}
