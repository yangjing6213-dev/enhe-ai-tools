import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  claimRun: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/seo-audit/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo-audit/public-api")>()),
  claimAnonymousSeoAuditRun: mocks.claimRun,
}));

import { POST } from "./route";

function request(body: unknown, origin = "https://www.enhe-tech.com.cn") {
  return new Request(
    "https://www.enhe-tech.com.cn/api/seo-audit/runs/run-1/claim",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/seo-audit/runs/[id]/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.claimRun.mockResolvedValue({ runId: "run-1", claimed: true });
  });

  it("claims a completed anonymous run without returning its token", async () => {
    const token = "public-token-".repeat(3);
    const response = await POST(request({ token }), {
      params: Promise.resolve({ id: "run-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, runId: "run-1", claimed: true });
    expect(JSON.stringify(payload)).not.toContain(token);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.claimRun).toHaveBeenCalledWith({
      runId: "run-1",
      userId: "user-1",
      publicToken: token,
    });
  });

  it("requires login and rejects foreign, expired, or reused claims", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const anonymous = await POST(request({ token: "public-token-".repeat(3) }), {
      params: Promise.resolve({ id: "run-1" }),
    });
    expect(anonymous.status).toBe(401);
    expect(mocks.claimRun).not.toHaveBeenCalled();

    const foreign = await POST(
      request({ token: "public-token-".repeat(3) }, "https://attacker.example"),
      { params: Promise.resolve({ id: "run-1" }) },
    );
    expect(foreign.status).toBe(403);

    mocks.claimRun.mockRejectedValueOnce(
      new Error("SEO_AUDIT_CLAIM_UNAVAILABLE"),
    );
    const unavailable = await POST(
      request({ token: "public-token-".repeat(3) }),
      { params: Promise.resolve({ id: "run-1" }) },
    );
    expect(unavailable.status).toBe(409);
    expect(await unavailable.json()).toEqual({
      ok: false,
      code: "SEO_AUDIT_CLAIM_UNAVAILABLE",
    });
  });
});
