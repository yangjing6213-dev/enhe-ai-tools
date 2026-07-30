import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertCsrf: vi.fn(),
  consume: vi.fn(),
  getCurrentUser: vi.fn(),
  loadSource: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/csrf", () => ({ assertValidCsrfToken: mocks.assertCsrf }));
vi.mock("@/lib/seo-audit/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo-audit/entitlements")>()),
  consumeSeoAuditCreditAndEnqueue: mocks.consume,
}));
vi.mock("@/lib/seo-audit/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo-audit/public-api")>()),
  loadOwnedSeoAuditRecheckSource: mocks.loadSource,
}));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: mocks.track }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request(
    "https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1/recheck",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://www.enhe-tech.com.cn",
      },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/seo-audit/runs/[id]/recheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.loadSource.mockResolvedValue({
      creditId: "credit-1",
      kind: "professional",
      targetUrl: "https://example.com/private/path",
    });
    mocks.consume.mockResolvedValue({ runId: "run-2" });
    mocks.track.mockResolvedValue(undefined);
  });

  it("starts a recheck from server-owned entitlement data", async () => {
    const response = await POST(request({ csrfToken: "csrf-token" }), {
      params: Promise.resolve({ id: "run-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toEqual({ ok: true, runId: "run-2", status: "queued" });
    expect(JSON.stringify(payload)).not.toContain("private/path");
    expect(mocks.assertCsrf).toHaveBeenCalledWith("csrf-token");
    expect(mocks.loadSource).toHaveBeenCalledWith("run-1", "user-1");
    expect(mocks.consume).toHaveBeenCalledWith({
      userId: "user-1",
      creditId: "credit-1",
      kind: "professional",
      targetUrl: "https://example.com/private/path",
    });
    expect(mocks.track).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "seo_audit_recheck_started" }),
    );
  });

  it("rejects unauthenticated and unavailable entitlement requests", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const anonymous = await POST(request({ csrfToken: "csrf-token" }), {
      params: Promise.resolve({ id: "run-1" }),
    });
    expect(anonymous.status).toBe(401);
    expect(mocks.loadSource).not.toHaveBeenCalled();

    mocks.loadSource.mockRejectedValueOnce(
      new Error("SEO_AUDIT_RECHECK_UNAVAILABLE"),
    );
    const unavailable = await POST(request({ csrfToken: "csrf-token" }), {
      params: Promise.resolve({ id: "run-1" }),
    });
    expect(unavailable.status).toBe(403);
    expect(mocks.consume).not.toHaveBeenCalled();
  });
});
