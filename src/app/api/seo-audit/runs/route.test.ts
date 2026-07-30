import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@/lib/seo-audit/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo-audit/entitlements")>()),
  enqueueAnonymousFreeAudit: mocks.enqueue,
}));
vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEvent: mocks.track,
}));

import { POST } from "./route";

function createRequest(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.enhe-tech.com.cn",
      "x-real-ip": "203.0.113.8",
      "x-forwarded-for": "198.51.100.99, 203.0.113.8",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/seo-audit/runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enqueue.mockResolvedValue({ runId: "run-1", cached: false });
    mocks.track.mockResolvedValue(undefined);
  });

  it("creates a free run with a server token and returns that token only once", async () => {
    const response = await POST(
      createRequest({ targetUrl: "https://example.com/private/path" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toEqual({
      ok: true,
      runId: "run-1",
      status: "queued",
      cached: false,
      token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });
    expect(mocks.enqueue).toHaveBeenCalledWith({
      targetUrl: "https://example.com/private/path",
      ipAddress: "203.0.113.8",
      publicToken: payload.token,
      engineVersion: "1.4.8",
    });
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`seo_audit_public_token=${payload.token}`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.track).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "seo_audit_submitted",
        entityType: "seo_audit_run",
        entityId: "run-1",
      }),
    );
  });

  it("rejects foreign origins, extra browser fields, and missing server IP", async () => {
    const foreign = await POST(
      createRequest(
        { targetUrl: "https://example.com" },
        { origin: "https://attacker.example" },
      ),
    );
    const extra = await POST(
      createRequest({ targetUrl: "https://example.com", pageLimit: 300 }),
    );
    const missingIp = await POST(
      new Request("https://www.enhe-tech.com.cn/api/seo-audit/runs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://www.enhe-tech.com.cn",
        },
        body: JSON.stringify({ targetUrl: "https://example.com" }),
      }),
    );

    expect(foreign.status).toBe(403);
    expect(await foreign.json()).toEqual({
      ok: false,
      code: "CROSS_SITE_REQUEST",
    });
    expect(extra.status).toBe(400);
    expect(await extra.json()).toEqual({ ok: false, code: "INVALID_REQUEST" });
    expect(missingIp.status).toBe(400);
    expect(await missingIp.json()).toEqual({
      ok: false,
      code: "CLIENT_IP_UNAVAILABLE",
    });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("maps anonymous entitlement limits to stable public status codes", async () => {
    mocks.enqueue.mockRejectedValueOnce({ code: "IP_DAILY_LIMIT" });

    const response = await POST(
      createRequest({ targetUrl: "https://example.com" }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      ok: false,
      code: "IP_DAILY_LIMIT",
    });
  });
});
