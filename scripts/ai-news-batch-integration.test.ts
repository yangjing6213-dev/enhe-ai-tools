import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { auditManifest, runBatchClient, sendBatchRequest } from "./ai-news-batch-client";
import { digest } from "@/lib/ai-news-batch-contract";
import { writeBatchFixture } from "./fixtures/ai-news-v2";

afterEach(() => vi.unstubAllEnvs());
const hasValidator = Boolean(process.env.ENHE_AI_NEWS_VALIDATOR_PATH && process.env.ENHE_AI_NEWS_PYTHON && process.env.ENHE_AI_NEWS_VALIDATOR_SHA256);

describe("V2 publishing integration", () => {
  it("never follows an authenticated redirect or leaks a rejected response body", async () => {
    let calls = 0;
    const server = createServer((_request, response) => { calls++; response.writeHead(302, { Location: "/leak" }); response.end("sensitive response marker"); });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing local port");
    try {
      await expect(sendBatchRequest(new URL(`http://127.0.0.1:${address.port}/api/admin/ai-news/import`), { operation: "snapshot" }, "local-test-token")).rejects.toThrow("BATCH_REQUEST_FAILED_RETRY_SAME_SLOT");
      expect(calls).toBe(1);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });

  it("rejects a snapshot whose content does not match its advertised digest", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, state: "SNAPSHOT", snapshot: {
      digest: "f".repeat(64), capturedAt: new Date().toISOString(), complete: true, total: 0, articles: [], events: []
    } }), { status: 200 }));
    try {
      await expect(sendBatchRequest(new URL("https://example.org/api/admin/ai-news/import"), { format: "batch-v2", operation: "snapshot" }, "local-test-token")).rejects.toThrow("SNAPSHOT_DIGEST_MISMATCH");
    } finally { spy.mockRestore(); }
  });

  it.runIf(hasValidator)("runs the unchanged validator twelve times before snapshot, stages six payloads, promotes, and verifies twelve real HTTP responses", async () => {
    const directory = await mkdtemp(join(tmpdir(), "enhe-v2-integration-"));
    const manifest = await writeBatchFixture(directory, process.env.ENHE_AI_NEWS_VALIDATOR_SHA256!);
    const receipt = join(directory, "receipt.json");
    const audited = await auditManifest(manifest);
    expect(audited.batch.topics).toHaveLength(6);
    expect(audited.batch.topics.every(topic => topic.article.content.includes("photo-fixture-body") && topic.article.englishContent.includes("photo-fixture-body"))).toBe(true);
    expect(audited.batch.topics.every(topic => !topic.article.canonicalUrl && !topic.article.slug)).toBe(true);
    let calls = 0; let staged = false; let published = false; let omitBody = false;
    const snapshot = { digest: digest({ articles: [], events: [] }), capturedAt: new Date().toISOString(), complete: true, total: 0, articles: [], events: [] };
    const records = audited.batch.topics.map((topic, i) => ({ articleId: `cms-${i}`, canonicalSlug: `db-final-${i}`, status: "draft", publicPaths: [] as string[],
      title: topic.article.title, englishTitle: topic.article.englishTitle, coverImage: topic.article.coverImage, sourceUrls: topic.article.externalSources.map(source => source.url) }));
    const server = createServer(async (request, response) => {
      calls++;
      if (request.method === "POST") {
        let text = ""; for await (const chunk of request) text += chunk;
        const body = JSON.parse(text); response.setHeader("Content-Type", "application/json");
        if (request.headers.authorization !== "Bearer local-test-token") { response.writeHead(401); response.end("Unauthorized"); return; }
        if (body.operation === "snapshot") { response.end(JSON.stringify({ ok: true, state: "SNAPSHOT", snapshot })); return; }
        if (body.operation === "stage") {
          expect(body.batch.topics).toHaveLength(6);
          expect(body.batch.topics.filter((topic: { kind: string }) => topic.kind === "FRESH_EVENT")).toHaveLength(5);
          staged = true;
        } else if (body.operation === "promote") {
          expect(staged).toBe(true); published = true;
          records.forEach(record => { record.status = "published"; record.publicPaths = [`/ai-news/${record.canonicalSlug}`, `/en/ai-news/${record.canonicalSlug}`]; });
        }
        response.end(JSON.stringify({ ok: true, state: published ? "PUBLISHED_AWAITING_PUBLIC_VERIFICATION" : "STAGED", runSlot: audited.batch.runSlot,
          manifestDigest: audited.manifestDigest, records, counts: { topicPackageCount: 6, localizedHtmlCount: 12, cmsRecordCount: 6, localizedPublicPageCount: 0 } }));
        return;
      }
      if (!published) { response.writeHead(404); response.end("Not published"); return; }
      expect(request.headers.authorization).toBeUndefined();
      const index = Number(request.url?.match(/db-final-(\d+)$/)?.[1]); const record = records[index];
      const english = request.url?.startsWith("/en/");
      const artifact = await readFile(join(directory, `${index}.${english ? "en" : "zh"}.html`), "utf8");
      const content = omitBody ? "" : artifact.match(/<div id="article-body">([\s\S]*?)<\/div>/)![1];
      response.end(`<html lang="${english ? "en-US" : "zh-CN"}"><head><link rel="canonical" href="http://${request.headers.host}${request.url}"></head><body><h1>${english ? record.englishTitle : record.title}</h1><img src="${record.coverImage}">${content}<a href="${record.sourceUrls[0]}">Source</a></body></html>`);
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing local port");
    vi.stubEnv("AI_NEWS_IMPORT_URL", `http://127.0.0.1:${address.port}/api/admin/ai-news/import`); vi.stubEnv("AI_NEWS_IMPORT_TOKEN", "local-test-token");
    try {
      const args = ["--manifest", manifest, "--receipt", receipt];
      expect((await runBatchClient(args)).state).toBe("AUDITED"); expect(calls).toBe(0);
      const auditReceipt = JSON.parse(await readFile(receipt, "utf8"));
      expect(auditReceipt.payloadFiles).toHaveLength(6);
      for (const file of auditReceipt.payloadFiles) {
        const payload = JSON.parse(await readFile(file, "utf8"));
        expect(payload.publishMode).toBe("draft"); expect(payload.article.englishContent).toContain("AI-assisted"); expect(payload.article.canonicalUrl).toBeUndefined();
      }
      await runBatchClient([...args, "--phase", "snapshot"]);
      const stage = await runBatchClient([...args, "--phase", "stage"]);
      expect(stage.counts.cmsRecordCount).toBe(6); expect(stage.counts.localizedPublicPageCount).toBe(0);
      await runBatchClient([...args, "--phase", "snapshot"]);
      const promoted = await runBatchClient([...args, "--phase", "promote"]);
      expect(promoted.state).toBe("PUBLISHED_AWAITING_PUBLIC_VERIFICATION"); expect(promoted.counts.localizedPublicPageCount).toBe(0);
      const verified = await runBatchClient([...args, "--phase", "verify"]);
      expect(verified.state).toBe("VERIFIED_PUBLISHED"); expect(verified.counts.localizedPublicPageCount).toBe(12);
      expect((await readFile(receipt, "utf8"))).not.toContain("local-test-token");
      expect(calls).toBe(16);
      omitBody = true;
      await expect(runBatchClient([...args, "--phase", "verify"])).rejects.toThrow("PUBLIC_PAGE_BODY");
      const failedVerification = JSON.parse(await readFile(receipt, "utf8"));
      expect(failedVerification.verification).toBeUndefined();
      expect(failedVerification.server.state).toBe("PUBLISHED_AWAITING_PUBLIC_VERIFICATION");
      vi.stubEnv("AI_NEWS_IMPORT_URL", "https://example.org/api/admin/ai-news/import");
      await expect(runBatchClient([...args, "--phase", "stage"])).rejects.toThrow("RECEIPT_ORIGIN_CHANGED");
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  }, 30000);
});
