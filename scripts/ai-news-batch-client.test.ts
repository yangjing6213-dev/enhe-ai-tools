import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertBatchEndpoint, credentialFreeEnvironment, runBatchClient, verifyPublicPages } from "./ai-news-batch-client";
import type { BatchRecord } from "@/lib/ai-news-batch-contract";

const temporary: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

describe("V2 publisher boundaries", () => {
  it("rejects plaintext remote, credential-bearing, query-bearing and wrong endpoints", () => {
    for (const url of ["http://remote.example/api/admin/ai-news/import", "https://user:password@example.org/api/admin/ai-news/import", "https://example.org/api/admin/ai-news/import?token=hidden", "https://example.org/wrong", "https://example.org/api/admin/ai-news/import#fragment"]) {
      expect(() => assertBatchEndpoint(url)).toThrow();
    }
    expect(assertBatchEndpoint("https://example.org/api/admin/ai-news/import").origin).toBe("https://example.org");
  });
  it("never passes publishing or database secrets into the validator environment", () => {
    const env = credentialFreeEnvironment({ AI_NEWS_IMPORT_TOKEN: "secret", DATABASE_URL: "secret-db", PATH: "untrusted", PYTHONPATH: "untrusted", SystemRoot: "C:\\Windows" });
    expect(env).toEqual({ SystemRoot: "C:\\Windows", NODE_ENV: "test", PYTHONIOENCODING: "utf-8" });
  });
  it("does not send a request or overwrite its receipt when local audits fail", async () => {
    const directory = await mkdtemp(join(tmpdir(), "enhe-batch-audit-")); temporary.push(directory);
    const manifest = join(directory, "manifest.json"); const receipt = join(directory, "receipt.json");
    await writeFile(manifest, JSON.stringify({ version: 2, runSlot: "invalid", topics: [] }));
    await writeFile(receipt, "existing receipt");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(runBatchClient(["--manifest", manifest, "--phase", "stage", "--receipt", receipt])).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore();
    expect(await readFile(receipt, "utf8")).toBe("existing receipt");
  });
  it("rejects an unknown CLI option before performing any work", async () => {
    await expect(runBatchClient(["--skip-validation", "true"])).rejects.toThrow();
  });
  it("accepts only twelve distinct server-derived pages with both locale canonicals and article evidence", async () => {
    const records: BatchRecord[] = Array.from({ length: 6 }, (_, i) => ({ articleId: `cms-${i}`, canonicalSlug: `stored-${i}`, status: "published",
      publicPaths: [`/ai-news/stored-${i}`, `/en/ai-news/stored-${i}`], title: `中文测试标题${i}`, englishTitle: `English test title ${i}`,
      coverImage: `https://images.unsplash.com/photo-${i}`, sourceUrls: [`https://example.org/source/${i}`] }));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = new URL(String(input)); const index = Number(url.pathname.match(/stored-(\d+)$/)?.[1]); const record = records[index];
      const english = url.pathname.startsWith("/en/");
      return new Response(`<html lang="${english ? "en-US" : "zh-CN"}"><head><link href="${url}" rel="canonical"><title>Article</title></head><body><h1>${english ? record.englishTitle : record.title}</h1><img src="${record.coverImage}"><a href="${record.sourceUrls[0]}">Source</a></body></html>`, { status: 200 });
    });
    const result = await verifyPublicPages("https://example.org", records);
    expect(result.localizedPublicPageCount).toBe(12);
    expect(fetchSpy).toHaveBeenCalledTimes(12);
    expect(fetchSpy.mock.calls.every(([, options]) => !options?.headers && options?.redirect === "error")).toBe(true);
    fetchSpy.mockResolvedValueOnce(new Response("<html><h1>Soft 404</h1></html>", { status: 200 }));
    await expect(verifyPublicPages("https://example.org", records)).rejects.toThrow("PUBLIC_PAGE");
    fetchSpy.mockRestore();
  });
  it("does not follow a public-page redirect", async () => {
    let redirected = 0;
    const server = createServer((request, response) => {
      if (request.url === "/elsewhere") redirected++;
      response.writeHead(302, { Location: "/elsewhere" }); response.end();
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing test port");
    const records: BatchRecord[] = Array.from({ length: 6 }, (_, i) => ({ articleId: `${i}`, canonicalSlug: `stored-${i}`, status: "published",
      publicPaths: [`/ai-news/stored-${i}`, `/en/ai-news/stored-${i}`], title: "标题", englishTitle: "English title", coverImage: "https://images.unsplash.com/photo", sourceUrls: ["https://example.org/source"] }));
    try {
      await expect(verifyPublicPages(`http://127.0.0.1:${address.port}`, records)).rejects.toThrow("PUBLIC_PAGE");
      expect(redirected).toBe(0);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
});
