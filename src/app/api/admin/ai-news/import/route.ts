import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { buildAiNewsImportPayloadFromHtml } from "@/lib/ai-news-html-import";
import { DuplicateAiNewsCoverImageError, importAiNewsArticle, verifyAiNewsImportToken } from "@/lib/ai-news-import";
import { AiNewsBatchError, handleAiNewsBatch } from "@/lib/ai-news-batch";
import { notifyBaiduSearch } from "@/lib/baidu-push";
import { notifyIndexNow } from "@/lib/indexnow";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeImportPayload(payload: unknown) {
  if (!isRecord(payload) || payload.format !== "html") return payload;

  if (typeof payload.html !== "string") {
    throw new Error("HTML import requires an html string.");
  }

  return buildAiNewsImportPayloadFromHtml({
    html: payload.html,
    publishMode: payload.publishMode === "published" ? "published" : "draft",
    importBatchId: typeof payload.importBatchId === "string" ? payload.importBatchId : undefined,
    categoryName: typeof payload.categoryName === "string" ? payload.categoryName : undefined,
    categorySlug: typeof payload.categorySlug === "string" ? payload.categorySlug : undefined,
    tags: Array.isArray(payload.tags) ? payload.tags.filter((tag): tag is string => typeof tag === "string") : undefined
  });
}

async function batchResponse(payload: Record<string, unknown>) {
  if (process.env.AI_NEWS_BATCH_V2_ENABLED !== "true") {
    return errorResponse(403, "BATCH_V2_DISABLED", "Batch V2 is disabled.");
  }
  if (payload.operation === "promote" && process.env.AI_NEWS_BATCH_V2_PUBLISH_ENABLED !== "true") {
    return errorResponse(403, "BATCH_PUBLISH_DISABLED", "Batch promotion is disabled.");
  }
  const validatorSha256 = process.env.AI_NEWS_BATCH_VALIDATOR_SHA256;
  if (payload.operation !== "snapshot" && !/^[a-f0-9]{64}$/.test(validatorSha256 ?? "")) {
    return errorResponse(503, "VALIDATOR_NOT_CONFIGURED", "The approved HTML validator must be configured.");
  }
  try {
    const result = await handleAiNewsBatch(payload, { validatorSha256 });
    if (result.state === "SNAPSHOT") return NextResponse.json(result);
    let cacheRefresh = "complete";
    const paths = ["/admin/ai-news"];
    if (result.state === "PUBLISHED_AWAITING_PUBLIC_VERIFICATION") {
      try { revalidateTag("public-news"); } catch { cacheRefresh = "pending"; }
      paths.push("/ai-news", "/en/ai-news", "/sitemap.xml", ...result.records!.flatMap(record => record.publicPaths));
    }
    for (const path of paths) {
      try { revalidatePath(path); } catch { cacheRefresh = "pending"; }
    }
    // Publication already committed. Discovery or cache failures must not be reported as a failed transaction.
    if (result.state === "PUBLISHED_AWAITING_PUBLIC_VERIFICATION") {
      const urls = result.records!.flatMap(record => record.publicPaths);
      await Promise.allSettled([notifyIndexNow(urls), notifyBaiduSearch(urls)]);
    }
    return NextResponse.json({ ...result, cacheRefresh });
  } catch (error) {
    if (error instanceof ZodError) return errorResponse(400, "BATCH_VALIDATION_ERROR", "Batch validation failed.");
    if (error instanceof AiNewsBatchError) return errorResponse(409, error.code, error.code);
    if (error instanceof DuplicateAiNewsCoverImageError) return errorResponse(409, error.code, "A cover image is already used.");
    // Do not serialize or log exception messages: database errors can contain credentials.
    return errorResponse(500, "BATCH_OPERATION_FAILED", "Batch operation failed; retry the same runSlot after checking its receipt.");
  }
}

async function readImportJson(request: NextRequest): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 2_000_000) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest) {
  if (!verifyAiNewsImportToken(request.headers.get("authorization"), process.env.AI_NEWS_IMPORT_TOKEN)) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid AI news import token.");
  }

  let payload: unknown;
  try {
    payload = await readImportJson(request);
  } catch {
    return errorResponse(400, "VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  if (isRecord(payload) && payload.format === "batch-v2") return batchResponse(payload);

  let importPayload: unknown;
  try {
    importPayload = normalizeImportPayload(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid AI news HTML import payload.";
    return errorResponse(400, "VALIDATION_ERROR", message);
  }

  try {
    const result = await importAiNewsArticle(importPayload);
    revalidatePath("/admin/ai-news");
    if (result.status === "published") {
      revalidatePath("/ai-news");
      revalidatePath("/en/ai-news");
      revalidatePath(`/ai-news/${result.canonicalSlug}`);
      revalidatePath(`/en/ai-news/${result.canonicalSlug}`);
      await notifyIndexNow([result.publicUrl]);
      await notifyBaiduSearch([result.publicUrl]);
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
    if (error instanceof DuplicateAiNewsCoverImageError) {
      return errorResponse(400, error.code, error.message);
    }
    console.error("AI news import failed.", error);
    return errorResponse(500, "IMPORT_FAILED", "AI news import failed.");
  }
}
