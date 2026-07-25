import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enqueueDueSeoAuditSchedules = vi.hoisted(() => vi.fn());
const reapSeoAuditArtifactUploads = vi.hoisted(() => vi.fn());

vi.mock("@/lib/seo-audit/entitlements", () => ({
  enqueueDueSeoAuditSchedules,
}));
vi.mock("@/lib/seo-audit/jobs", () => ({
  reapSeoAuditArtifactUploads,
}));

import { POST, runtime } from "./route";

const workerToken = "current-worker-token-1234567890";
const originalWorkerToken = process.env.AUDIT_WORKER_TOKEN_CURRENT;

function request(body: unknown, authorization = `Bearer ${workerToken}`) {
  return new Request(
    "http://localhost/api/internal/seo-audit/schedules/enqueue",
    {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUDIT_WORKER_TOKEN_CURRENT = workerToken;
});

afterEach(() => {
  if (originalWorkerToken === undefined) {
    delete process.env.AUDIT_WORKER_TOKEN_CURRENT;
  } else {
    process.env.AUDIT_WORKER_TOKEN_CURRENT = originalWorkerToken;
  }
});

describe("POST /api/internal/seo-audit/schedules/enqueue", () => {
  it("uses Node.js, rejects unauthorized/invalid requests, and calls the schedule domain", async () => {
    expect(runtime).toBe("nodejs");

    const unauthorized = await POST(request({}, "Bearer wrong-worker-token-1234567890"));
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
    });

    const invalid = await POST(request({ limit: 51 }));
    expect(invalid.status).toBe(400);
    expect(enqueueDueSeoAuditSchedules).not.toHaveBeenCalled();

    reapSeoAuditArtifactUploads.mockResolvedValueOnce({ cleaned: 1, failed: 0 });
    enqueueDueSeoAuditSchedules.mockResolvedValueOnce({ enqueued: 2 });
    const response = await POST(request({ limit: 10 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      enqueued: 2,
      artifactUploadsCleaned: 1,
      artifactUploadCleanupFailed: 0,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(reapSeoAuditArtifactUploads).toHaveBeenCalledWith();
    expect(enqueueDueSeoAuditSchedules).toHaveBeenCalledWith({ limit: 10 });
  });
});
