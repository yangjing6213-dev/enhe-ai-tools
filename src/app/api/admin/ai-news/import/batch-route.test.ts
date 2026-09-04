import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ batch: vi.fn(), cache: vi.fn(), tag: vi.fn(), index: vi.fn(), baidu: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.cache, revalidateTag: mocks.tag }));
vi.mock("@/lib/ai-news-batch", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/ai-news-batch")>(), handleAiNewsBatch: mocks.batch }));
vi.mock("@/lib/indexnow", () => ({ notifyIndexNow: mocks.index }));
vi.mock("@/lib/baidu-push", () => ({ notifyBaiduSearch: mocks.baidu }));
import { POST } from "./route";

function request(payload: unknown, token = "local-test-token") {
  return new Request("http://localhost/api/admin/ai-news/import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }) as NextRequest;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AI_NEWS_IMPORT_TOKEN", "local-test-token");
  vi.stubEnv("AI_NEWS_BATCH_V2_ENABLED", "false");
  vi.stubEnv("AI_NEWS_BATCH_V2_PUBLISH_ENABLED", "false");
  vi.stubEnv("AI_NEWS_BATCH_VALIDATOR_SHA256", "a".repeat(64));
});
afterEach(() => vi.unstubAllEnvs());

describe("AI news V2 route gates", () => {
  it("authenticates before reading a batch and defaults disabled", async () => {
    expect((await POST(request({ format: "batch-v2", operation: "snapshot" }, "wrong"))).status).toBe(401);
    expect((await POST(request({ format: "batch-v2", operation: "snapshot" }))).status).toBe(403);
    expect(mocks.batch).not.toHaveBeenCalled();
  });
  it("allows read-only snapshots but refuses promotion without its separate switch", async () => {
    vi.stubEnv("AI_NEWS_BATCH_V2_ENABLED", "true");
    mocks.batch.mockResolvedValueOnce({ ok: true, state: "SNAPSHOT", snapshot: { complete: true } });
    expect((await POST(request({ format: "batch-v2", operation: "snapshot" }))).status).toBe(200);
    expect((await POST(request({ format: "batch-v2", operation: "promote" }))).status).toBe(403);
    expect(mocks.batch).toHaveBeenCalledTimes(1);
    expect(mocks.cache).not.toHaveBeenCalled();
  });
  it("requires the configured validator identity before staging", async () => {
    vi.stubEnv("AI_NEWS_BATCH_V2_ENABLED", "true");
    vi.stubEnv("AI_NEWS_BATCH_VALIDATOR_SHA256", "");
    const response = await POST(request({ format: "batch-v2", operation: "stage" }));
    expect(response.status).toBe(503);
    expect(mocks.batch).not.toHaveBeenCalled();
  });
  it("invalidates both actual locales after commit and preserves the committed receipt if cache invalidation fails", async () => {
    vi.stubEnv("AI_NEWS_BATCH_V2_ENABLED", "true"); vi.stubEnv("AI_NEWS_BATCH_V2_PUBLISH_ENABLED", "true");
    mocks.batch.mockResolvedValueOnce({ ok: true, state: "PUBLISHED_AWAITING_PUBLIC_VERIFICATION", records: [
      { canonicalSlug: "db-canonical", publicPaths: ["/ai-news/db-canonical", "/en/ai-news/db-canonical"] }
    ] });
    mocks.cache.mockImplementationOnce(() => { throw new Error("private internal details"); });
    const response = await POST(request({ format: "batch-v2", operation: "promote" }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.state).toBe("PUBLISHED_AWAITING_PUBLIC_VERIFICATION");
    expect(body.cacheRefresh).toBe("pending");
    expect(mocks.tag).toHaveBeenCalledWith("public-news");
    expect(mocks.cache).toHaveBeenCalledWith("/ai-news/db-canonical");
    expect(mocks.cache).toHaveBeenCalledWith("/en/ai-news/db-canonical");
    expect(JSON.stringify(body)).not.toContain("private internal details");
  });
  it("does not leak server exception messages or log secrets", async () => {
    vi.stubEnv("AI_NEWS_BATCH_V2_ENABLED", "true");
    mocks.batch.mockRejectedValueOnce(new Error("credential-like-sensitive-value"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request({ format: "batch-v2", operation: "snapshot" }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("credential-like-sensitive-value");
    expect(log).not.toHaveBeenCalled(); log.mockRestore();
  });
});
