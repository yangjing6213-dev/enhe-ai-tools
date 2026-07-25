import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jobMocks = vi.hoisted(() => ({
  claimSeoAuditJob: vi.fn(),
  heartbeatSeoAuditJob: vi.fn(),
  completeSeoAuditJob: vi.fn(),
  failSeoAuditJob: vi.fn(),
}));

vi.mock("@/lib/seo-audit/jobs", () => ({
  SEO_AUDIT_FAILURE_CODES: [
    "INVALID_TARGET",
    "ROBOTS_BLOCKED",
    "SYSTEM_TIMEOUT",
    "SYSTEM_NETWORK",
    "SYSTEM_INTERNAL",
    "ARTIFACT_INVALID",
    "ARTIFACT_STORAGE",
  ],
  ...jobMocks,
}));

import {
  POST as claimPOST,
  runtime as claimRuntime,
} from "./claim/route";
import {
  POST as heartbeatPOST,
  runtime as heartbeatRuntime,
} from "./[id]/heartbeat/route";
import {
  POST as completePOST,
  runtime as completeRuntime,
} from "./[id]/complete/route";
import {
  POST as failPOST,
  runtime as failRuntime,
} from "./[id]/fail/route";

const workerToken = "current-worker-token-1234567890";
const originalWorkerToken = process.env.AUDIT_WORKER_TOKEN_CURRENT;

function jsonRequest(path: string, body: unknown, token = workerToken) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function routeContext(id = "run-1") {
  return { params: Promise.resolve({ id }) };
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUDIT_WORKER_TOKEN_CURRENT = workerToken;
  delete process.env.AUDIT_WORKER_TOKEN_PREVIOUS;
});

afterEach(() => {
  if (originalWorkerToken === undefined) {
    delete process.env.AUDIT_WORKER_TOKEN_CURRENT;
  } else {
    process.env.AUDIT_WORKER_TOKEN_CURRENT = originalWorkerToken;
  }
});

describe("internal SEO audit job routes", () => {
  it("uses the Node.js runtime for every worker route", () => {
    expect(claimRuntime).toBe("nodejs");
    expect(heartbeatRuntime).toBe("nodejs");
    expect(completeRuntime).toBe("nodejs");
    expect(failRuntime).toBe("nodejs");
  });

  it.each([null, "wrong-worker-token-1234567890", "malformed token"])(
    "returns the same 401 payload for missing, malformed, or wrong auth",
    async (token) => {
      const request = jsonRequest(
        "/api/internal/seo-audit/jobs/claim",
        { workerId: "worker-1", engineVersion: "1.4.4" },
      );
      if (token === null) request.headers.delete("authorization");
      else if (token === "malformed token") {
        request.headers.set("authorization", token);
      } else {
        request.headers.set("authorization", `Bearer ${token}`);
      }

      const response = await claimPOST(request);
      const payload = await readJson(response);

      expect(response.status).toBe(401);
      expect(payload).toEqual({
        ok: false,
        code: "UNAUTHORIZED",
      });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(jobMocks.claimSeoAuditJob).not.toHaveBeenCalled();
      expect(JSON.stringify(payload)).not.toContain(workerToken);
    },
  );

  it("validates claim input and returns only the domain job DTO", async () => {
    const invalid = await claimPOST(
      jsonRequest("/api/internal/seo-audit/jobs/claim", {
        workerId: "worker 1",
        engineVersion: "1.4.4",
      }),
    );
    expect(invalid.status).toBe(400);
    expect(await readJson(invalid)).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });

    jobMocks.claimSeoAuditJob.mockResolvedValueOnce({
      id: "run-1",
      leaseToken: "lease-token-12345678901234567890",
      targetUrl: "https://example.com",
      pageLimit: 100,
      requestTimeoutSeconds: 8,
      totalTimeoutSeconds: 720,
      engineVersion: "1.4.4",
    });
    const response = await claimPOST(
      jsonRequest("/api/internal/seo-audit/jobs/claim", {
        workerId: "worker-1",
        engineVersion: "1.4.4",
      }),
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      ok: true,
      job: expect.objectContaining({ id: "run-1" }),
    });
    expect(jobMocks.claimSeoAuditJob).toHaveBeenCalledWith({
      workerId: "worker-1",
      engineVersion: "1.4.4",
    });
  });

  it("validates heartbeat progress and returns cooperative cancellation", async () => {
    const invalid = await heartbeatPOST(
      jsonRequest("/api/internal/seo-audit/jobs/run-1/heartbeat", {
        leaseToken: "lease-token-12345678901234567890",
        workerId: "worker-1",
        engineVersion: "1.4.4",
        progress: {
          phase: "crawl",
          pagesProcessed: 1,
          pageLimit: 100,
          targetUrl: "https://secret.example/path",
        },
      }),
      routeContext(),
    );
    expect(invalid.status).toBe(400);

    jobMocks.heartbeatSeoAuditJob.mockResolvedValueOnce({
      cancelRequested: true,
      leaseExpiresAt: null,
    });
    const response = await heartbeatPOST(
      jsonRequest("/api/internal/seo-audit/jobs/run-1/heartbeat", {
        leaseToken: "lease-token-12345678901234567890",
        workerId: "worker-1",
        engineVersion: "1.4.4",
        progress: { phase: "cancel", pagesProcessed: 10, pageLimit: 100 },
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      ok: true,
      cancelRequested: true,
      leaseExpiresAt: null,
    });
  });

  it("rejects worker-provided summary fields and completes from the gzip bundle only", async () => {
    const invalid = await completePOST(
      jsonRequest("/api/internal/seo-audit/jobs/run-1/complete", {
        leaseToken: "lease-token-12345678901234567890",
        reportGzipBase64: "H4sIAAAAAAAA",
        summary: { score: 100 },
      }),
      routeContext(),
    );
    expect(invalid.status).toBe(400);

    jobMocks.completeSeoAuditJob.mockResolvedValueOnce({
      status: "completed",
      alreadyCompleted: false,
    });
    const response = await completePOST(
      jsonRequest("/api/internal/seo-audit/jobs/run-1/complete", {
        leaseToken: "lease-token-12345678901234567890",
        reportGzipBase64: "H4sIAAAAAAAA",
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      ok: true,
      status: "completed",
      alreadyCompleted: false,
    });
    expect(jobMocks.completeSeoAuditJob).toHaveBeenCalledWith({
      runId: "run-1",
      leaseToken: "lease-token-12345678901234567890",
      reportGzipBase64: "H4sIAAAAAAAA",
    });
  });

  it("accepts only stable failure codes and never logs sensitive exception text", async () => {
    const invalid = await failPOST(
      jsonRequest("/api/internal/seo-audit/jobs/run-1/fail", {
        leaseToken: "lease-token-12345678901234567890",
        failureCode: "https://secret.example/path?token=secret",
      }),
      routeContext(),
    );
    expect(invalid.status).toBe(400);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    jobMocks.failSeoAuditJob.mockRejectedValueOnce(
      new Error("https://secret.example/path?token=secret"),
    );
    const response = await failPOST(
      jsonRequest("/api/internal/seo-audit/jobs/run-1/fail", {
        leaseToken: "lease-token-12345678901234567890",
        failureCode: "SYSTEM_TIMEOUT",
      }),
      routeContext(),
    );

    expect(response.status).toBe(500);
    expect(await readJson(response)).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
    });
    expect(consoleError).toHaveBeenCalledWith("SEO audit worker route failed.");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret.example");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(workerToken);
    consoleError.mockRestore();
  });

  it("maps stable domain failures to stable HTTP statuses", async () => {
    jobMocks.completeSeoAuditJob.mockRejectedValueOnce({
      code: "REPORT_TOO_LARGE",
    });

    const response = await completePOST(
      jsonRequest("/api/internal/seo-audit/jobs/run-1/complete", {
        leaseToken: "lease-token-12345678901234567890",
        reportGzipBase64: "H4sIAAAAAAAA",
      }),
      routeContext(),
    );

    expect(response.status).toBe(413);
    expect(await readJson(response)).toEqual({
      ok: false,
      code: "REPORT_TOO_LARGE",
    });
  });
});
