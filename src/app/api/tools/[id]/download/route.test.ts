import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadRateLimitError } from "@/lib/access-rules";
import { serializeAnalyticsAttributionCookie } from "@/lib/analytics-client-payload";

const mocks = vi.hoisted(() => ({
  tool: vi.fn(), access: vi.fn(), workflowUrl: vi.fn(), secureUrl: vi.fn(),
  localPath: vi.fn(), stat: vi.fn(), stream: vi.fn(), track: vi.fn(),
  after: vi.fn(), afterTasks: [] as Array<() => Promise<void>>,
}));
vi.mock("next/server", async importOriginal => ({ ...await importOriginal<typeof import("next/server")>(), after: mocks.after }));
vi.mock("@/lib/db", () => ({ prisma: { tool: { findUnique: mocks.tool } } }));
vi.mock("@/lib/access", () => ({ assertDownloadAccess: mocks.access }));
vi.mock("@/lib/ai-workflows/cos", () => ({ getAiWorkflowDownloadUrl: mocks.workflowUrl }));
vi.mock("@/lib/storage", () => ({ getSecureFileDownloadUrl: mocks.secureUrl, resolvePrivateLocalUploadPath: mocks.localPath }));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: mocks.track }));
vi.mock("node:fs", () => ({ createReadStream: mocks.stream }));
vi.mock("node:fs/promises", () => ({ stat: mocks.stat }));

import { GET as handleDownload } from "./route";

async function GET(...args: Parameters<typeof handleDownload>) {
  try {
    return await handleDownload(...args);
  } finally {
    for (const callback of mocks.afterTasks.splice(0)) await callback();
  }
}

const file = {
  id: "file-current", filePath: "private-path-must-not-log", fileName: "private-name-must-not-log.zip",
  mimeType: "application/zip",
};
const signedUrl = "https://storage.example/download?signature=must-not-log";
const params = { params: Promise.resolve({ id: "tool-1" }) };
const names = () => mocks.track.mock.calls.map(([event]) => event.eventName);
const request = (cookie?: string) => new Request("https://www.enhe-tech.com.cn/api/tools/tool-1/download?private=must-not-log", {
  headers: cookie ? { cookie } : {},
});

describe("download response preparation analytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.tool.mockResolvedValue({ type: "software" });
    mocks.access.mockResolvedValue(file);
    mocks.localPath.mockReturnValue(null);
    mocks.secureUrl.mockResolvedValue(signedUrl);
    mocks.workflowUrl.mockReturnValue(signedUrl);
    mocks.stat.mockResolvedValue({ isFile: () => true, size: 12 });
    mocks.stream.mockImplementation(() => Readable.from([Buffer.from("private-body")]));
    mocks.track.mockResolvedValue(undefined);
    mocks.afterTasks.length = 0;
    mocks.after.mockImplementation((callback: () => Promise<void>) => { mocks.afterTasks.push(callback); });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("prepares an ordinary signed redirect without recording the signed URL", async () => {
    const response = await GET(request(), params);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(signedUrl);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(names()).toEqual(["product_download_requested", "product_download_access_granted", "product_download_response_prepared"]);
    expect(mocks.track.mock.calls[2][0]).toMatchObject({
      entityType: "tool", entityId: "tool-1", metadata: { stage: "response", responseKind: "signed_redirect" },
      networkContext: { ip: null, userAgent: null },
    });
    expect(mocks.access.mock.invocationCallOrder[0]).toBeLessThan(mocks.track.mock.invocationCallOrder[0]);
    expect(mocks.secureUrl).toHaveBeenCalledWith(file, expect.any(String));
    expect(JSON.stringify(mocks.track.mock.calls)).not.toMatch(/signature|private-path|private-name|must-not-log/);
  });

  it("preserves the private local response headers and records only stream preparation", async () => {
    mocks.localPath.mockReturnValue("private-local-path-must-not-log");
    const response = await GET(request(), params);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("private-body");
    expect(response.headers.get("content-length")).toBe("12");
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toBe(`attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.track.mock.calls[2][0].metadata).toMatchObject({ responseKind: "private_stream" });
    expect(names()).not.toContain("product_download_completed");
    expect(JSON.stringify(mocks.track.mock.calls)).not.toMatch(/private-local-path|private-name|private-body/);
  });

  it("prepares an anonymous free workflow redirect and preserves its visitor cookie", async () => {
    mocks.tool.mockResolvedValue({ type: "ai_workflow" });
    const response = await GET(request(), params);

    expect(response.status).toBe(302);
    expect(response.headers.get("set-cookie")).toMatch(/^aiw_visitor=[a-f0-9]{64}; Path=\/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure$/);
    expect(mocks.access).toHaveBeenCalledWith("tool-1", expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(mocks.workflowUrl).toHaveBeenCalledWith(file);
    expect(names()).toEqual(["product_download_requested", "product_download_access_granted", "product_download_response_prepared"]);
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("aiw_visitor");
  });

  it("uses the purchased workflow file returned by access checks rather than substituting another version", async () => {
    mocks.tool.mockResolvedValue({ type: "ai_workflow" });
    const purchasedFile = { ...file, id: "file-purchased-v3" };
    mocks.access.mockResolvedValue(purchasedFile);
    const visitor = "a".repeat(64);
    const response = await GET(request(`aiw_visitor=${visitor}`), params);

    expect(response.status).toBe(302);
    expect(mocks.access).toHaveBeenCalledWith("tool-1", visitor);
    expect(mocks.workflowUrl).toHaveBeenCalledWith(purchasedFile);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("file-purchased-v3");
  });

  it.each(["login", "pay-required", "unexpected-access-error"])("preserves %s access control flow without claiming access was granted", async (kind) => {
    const denied = Object.assign(new Error("private-auth-error-must-not-log"), { digest: kind === "unexpected-access-error" ? undefined : `NEXT_REDIRECT;replace;/${kind};307;` });
    mocks.access.mockRejectedValue(denied);

    await expect(GET(request(), params)).rejects.toBe(denied);
    expect(names()).toEqual(["product_download_requested", "product_download_request_failed"]);
    expect(mocks.track.mock.calls[1][0].metadata).toMatchObject({ stage: "access", reason: "access_not_granted" });
    expect(mocks.secureUrl).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.track.mock.calls)).not.toMatch(/private-auth-error|NEXT_REDIRECT|pay-required/);
  });

  it("preserves the original rate limit status and message", async () => {
    mocks.access.mockRejectedValue(new DownloadRateLimitError("下载过于频繁，请稍后再试。"));
    const response = await GET(request(), params);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ message: "下载过于频繁，请稍后再试。" });
    expect(names()).toEqual(["product_download_requested", "product_download_request_failed"]);
    expect(mocks.track.mock.calls[1][0].metadata).toMatchObject({ stage: "access", reason: "rate_limited" });
  });

  it("does not claim access and file availability when no file was returned", async () => {
    mocks.access.mockResolvedValue(null);
    const response = await GET(request(), params);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(names()).toEqual(["product_download_requested", "product_download_request_failed"]);
    expect(mocks.track.mock.calls[1][0].metadata).toMatchObject({ stage: "access", reason: "file_unavailable" });
  });

  it.each(["workflow-signing", "ordinary-signing", "local-stat", "local-stream"])("records bounded preparation failure for %s while preserving the original error response", async (kind) => {
    const failure = new Error("private-error-with-signature-must-not-log");
    if (kind === "workflow-signing") {
      mocks.tool.mockResolvedValue({ type: "ai_workflow" });
      mocks.workflowUrl.mockImplementation(() => { throw failure; });
    } else if (kind === "ordinary-signing") mocks.secureUrl.mockRejectedValue(failure);
    else {
      mocks.localPath.mockReturnValue("private-local-path-must-not-log");
      if (kind === "local-stat") mocks.stat.mockRejectedValue(failure);
      else mocks.stream.mockImplementation(() => { throw failure; });
    }
    const response = await GET(request(), params);

    expect(response.status).toBe(kind === "workflow-signing" ? 503 : 404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(names()).toEqual(["product_download_requested", "product_download_access_granted", "product_download_request_failed"]);
    expect(mocks.track.mock.calls[2][0].metadata).toMatchObject({ stage: "response", reason: "response_preparation_failed" });
    expect(JSON.stringify(mocks.track.mock.calls)).not.toMatch(/private-error|signature|private-local-path/);
  });

  it("keeps requests separate without claiming distinct users or completed transfers", async () => {
    await GET(request(), params);
    await GET(request(), params);
    expect(names()).toEqual(Array(2).fill(["product_download_requested", "product_download_access_granted", "product_download_response_prepared"]).flat());
  });

  it.each(["signed_redirect", "private_stream"])("keeps a successful %s response even when analytics throws", async (kind) => {
    mocks.track.mockRejectedValue(new Error("analytics unavailable"));
    if (kind === "private_stream") mocks.localPath.mockReturnValue("private-local-path");
    const response = await GET(request(), params);
    expect(response.status).toBe(kind === "signed_redirect" ? 302 : 200);
    expect(mocks.track).toHaveBeenCalledTimes(3);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    if (kind === "private_stream") expect(await response.text()).toBe("private-body");
  });

  it("reuses bounded existing landing attribution without logging the raw cookie or request URL", async () => {
    const attribution = {
      sessionId: "session-buyer", landingId: "landing-buyer", firstLandingPath: "/en/ai-workflows/example",
      landingPath: "/ai-workflows/example", contentType: "ai_workflow_detail", source: "google",
      trafficMedium: "organic_search", locale: "en", createdAt: 1, lastSeenAt: 2, attributionVersion: 2,
    };
    const cookie = serializeAnalyticsAttributionCookie(attribution);
    await GET(request(`session-secret=raw-cookie-must-not-log; enhe_analytics_attribution=${cookie}`), params);

    expect(mocks.track).toHaveBeenCalledTimes(3);
    for (const [event] of mocks.track.mock.calls) {
      expect(event).toMatchObject({ metadata: { attribution }, networkContext: { ip: null, userAgent: null } });
      expect(event).not.toHaveProperty("userId");
    }
    expect(JSON.stringify(mocks.track.mock.calls)).not.toMatch(/session-secret|raw-cookie|private=|signature/);
  });

  it("ignores malformed attribution and preserves the original tool lookup error", async () => {
    const failure = new Error("private-database-error");
    mocks.tool.mockRejectedValue(failure);
    await expect(GET(request("enhe_analytics_attribution=not-json"), params)).rejects.toBe(failure);
    expect(names()).toEqual(["product_download_requested", "product_download_request_failed"]);
    expect(mocks.track.mock.calls[1][0].metadata).toMatchObject({ stage: "request", reason: "tool_lookup_failed" });
    expect(JSON.stringify(mocks.track.mock.calls)).not.toMatch(/not-json|private-database-error/);
  });

  it("captures event order and observation time before one background callback without rereading request or storage", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T08:00:00.000Z"));
    const incoming = request();
    const response = await handleDownload(incoming, params);

    expect(response.status).toBe(302);
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.track).not.toHaveBeenCalled();
    const reads = mocks.tool.mock.calls.length;
    const accessChecks = mocks.access.mock.calls.length;
    vi.spyOn(incoming.headers, "get").mockImplementation(() => { throw new Error("request already finished"); });
    vi.setSystemTime(new Date("2026-10-22T08:05:00.000Z"));
    await mocks.afterTasks[0]();

    expect(names()).toEqual(["product_download_requested", "product_download_access_granted", "product_download_response_prepared"]);
    for (const [event] of mocks.track.mock.calls) expect(event.metadata.observedAt).toBe("2026-10-22T08:00:00.000Z");
    expect(mocks.tool).toHaveBeenCalledTimes(reads);
    expect(mocks.access).toHaveBeenCalledTimes(accessChecks);
    expect(mocks.secureUrl).toHaveBeenCalledTimes(1);
  });

  it("returns the original response while background analytics is still pending", async () => {
    let release!: () => void;
    mocks.track.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));

    const response = await handleDownload(request(), params);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(signedUrl);
    expect(mocks.track).not.toHaveBeenCalled();
    const background = mocks.afterTasks[0]();
    expect(mocks.track).toHaveBeenCalledTimes(1);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    release();
    await background;
    expect(mocks.track).toHaveBeenCalledTimes(3);
  });

  it("preserves a successful response when background task scheduling itself is unavailable", async () => {
    mocks.after.mockImplementation(() => { throw new Error("after unavailable"); });
    const response = await GET(request(), params);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(signedUrl);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("preserves Next redirect control flow when background task scheduling is unavailable", async () => {
    mocks.after.mockImplementation(() => { throw new Error("after unavailable"); });
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    mocks.access.mockRejectedValue(redirect);
    await expect(GET(request(), params)).rejects.toBe(redirect);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("does not turn a later stream error into a claim that transfer completed", async () => {
    mocks.localPath.mockReturnValue("private-local-path");
    mocks.stream.mockImplementation(() => new Readable({ read() { this.destroy(new Error("later transfer failed")); } }));
    const response = await GET(request(), params);
    await expect(response.text()).rejects.toThrow("later transfer failed");
    expect(names()).toEqual(["product_download_requested", "product_download_access_granted", "product_download_response_prepared"]);
  });

  it("drops raw query and referrer text from new download events", async () => {
    const cookie = encodeURIComponent(JSON.stringify({
      sessionId: "session-buyer", landingId: "landing-buyer", firstLandingPath: "/software/example",
      landingPath: "/software/example", contentType: "software_detail", source: "google", trafficMedium: "organic_search",
      locale: "zh", createdAt: 1, lastSeenAt: 2, attributionVersion: 2,
      searchQuery: "account-PII-must-not-log", referrer: "https://google.com", utmCampaign: "campaign-must-not-log",
    }));
    await GET(request(`enhe_analytics_attribution=${cookie}`), params);

    expect(mocks.track).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(mocks.track.mock.calls)).not.toMatch(/account-PII|campaign-must-not-log|searchQuery|referrer|utmCampaign/);
  });

  it("does not record an untrusted unmatched route id as an entity or path", async () => {
    mocks.tool.mockResolvedValue(null);
    const failure = new Error("unpublished or missing tool");
    mocks.access.mockRejectedValue(failure);
    await expect(GET(request(), { params: Promise.resolve({ id: "private-personal-input@example.com" }) })).rejects.toBe(failure);

    expect(names()).toEqual(["product_download_requested", "product_download_request_failed"]);
    for (const [event] of mocks.track.mock.calls) {
      expect(event.entityId).toBeUndefined();
      expect(event.path).toBe("/api/tools/[id]/download");
    }
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("private-personal-input");
  });
});
