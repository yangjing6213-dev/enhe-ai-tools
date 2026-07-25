import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimSeoAuditJob,
  completeSeoAuditJob,
  failSeoAuditJob,
  heartbeatSeoAuditJob,
  requestSeoAuditJobCancellation,
} from "@/lib/seo-audit/jobs";

const now = new Date("2026-07-25T08:00:00.000Z");

function createJobDb() {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn(),
    seoAuditRun: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    seoAuditWorkerHeartbeat: {
      upsert: vi.fn(),
    },
  };
  const db = {
    $transaction: vi.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
    seoAuditRun: {
      findUnique: vi.fn(),
    },
  };
  return { db, tx };
}

function rawSql(call: unknown) {
  return call as { sql: string; values: unknown[] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("durable SEO audit job claiming", () => {
  it("claims a queued run with one atomic SKIP LOCKED CTE and stores only the lease hash", async () => {
    const { db, tx } = createJobDb();
    const leaseBytes = Buffer.alloc(32, 7);
    const expectedLease = leaseBytes.toString("base64url");
    const expectedHash = createHash("sha256")
      .update(expectedLease)
      .digest("hex");
    tx.$queryRaw.mockResolvedValueOnce([
      {
        id: "run-1",
        kind: "professional",
        targetUrl: "https://example.com/path",
        normalizedOrigin: "https://example.com",
        pageLimit: 100,
        totalTimeoutSeconds: 720,
        leaseExpiresAt: new Date("2026-07-25T08:01:30.000Z"),
        attemptCount: 1,
        engineVersion: "1.4.4",
      },
    ]);

    const job = await claimSeoAuditJob(
      { workerId: "worker-1", engineVersion: "1.4.4" },
      {
        db: db as never,
        now,
        leaseDurationMs: 90_000,
        randomBytes: () => leaseBytes,
      },
    );

    expect(job).toEqual({
      id: "run-1",
      leaseToken: expectedLease,
      leaseExpiresAt: new Date("2026-07-25T08:01:30.000Z"),
      targetUrl: "https://example.com/path",
      pageLimit: 100,
      requestTimeoutSeconds: 8,
      totalTimeoutSeconds: 720,
      engineVersion: "1.4.4",
      kind: "professional",
      attemptCount: 1,
    });
    expect(job).not.toHaveProperty("leaseTokenHash");
    expect(job).not.toHaveProperty("publicTokenHash");
    expect(job).not.toHaveProperty("reportJsonKey");
    expect(job).not.toHaveProperty("requestIpHash");

    const claimSql = rawSql(tx.$queryRaw.mock.calls[0][0]);
    expect(claimSql.sql).toMatch(/FOR UPDATE\s+SKIP LOCKED/i);
    expect(claimSql.sql).toMatch(/"status"\s*=\s*'queued'/i);
    expect(claimSql.sql).toContain("lease_token_hash");
    expect(claimSql.sql).toMatch(
      /"attempt_count"\s*=\s*runs\."attempt_count"\s*\+\s*1/,
    );
    expect(claimSql.sql).toContain("available_at");
    expect(claimSql.sql).toContain("created_at");
    expect(claimSql.sql).toContain("professional");
    expect(claimSql.sql).toContain("scheduled");
    expect(claimSql.sql).toContain("free");
    expect(claimSql.sql).toMatch(/EXTRACT\s*\(\s*EPOCH/i);
    expect(claimSql.values).toContain(expectedHash);
    expect(claimSql.values).not.toContain(expectedLease);
  });

  it("recovers expired leases before claiming and refunds max-attempt system failures in the same transaction", async () => {
    const { db, tx } = createJobDb();
    tx.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      claimSeoAuditJob(
        { workerId: "worker-1", engineVersion: "1.4.4" },
        { db: db as never, now, randomBytes: () => Buffer.alloc(32, 1) },
      ),
    ).resolves.toBeNull();

    const recoverySql = rawSql(tx.$executeRaw.mock.calls[0][0]);
    expect(recoverySql.sql).toContain("lease_expires_at");
    expect(recoverySql.sql).toContain("max_attempts");
    expect(recoverySql.sql).toContain("'queued'");
    expect(recoverySql.sql).toContain("'failed'");
    expect(recoverySql.sql).toContain("'cancelled'");
    expect(recoverySql.sql).toContain("MAX_ATTEMPTS_EXCEEDED");
    expect(recoverySql.sql).toMatch(
      /"remaining_runs"\s*=\s*credits\."remaining_runs"\s*\+\s*1/,
    );
    expect(recoverySql.sql).toMatch(
      /credits\."remaining_runs"\s*<\s*credits\."total_runs"/,
    );
  });
});

describe("SEO audit job state machine", () => {
  it("extends a matching live lease and records only bounded progress metadata", async () => {
    const { db, tx } = createJobDb();
    const leaseToken = "lease-token-12345678901234567890";
    const leaseTokenHash = createHash("sha256").update(leaseToken).digest("hex");
    tx.seoAuditRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      status: "running",
      leaseTokenHash,
      leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
    });
    tx.seoAuditRun.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.seoAuditWorkerHeartbeat.upsert.mockResolvedValueOnce({ id: "heartbeat-1" });

    const result = await heartbeatSeoAuditJob(
      {
        runId: "run-1",
        leaseToken,
        workerId: "worker-1",
        engineVersion: "1.4.4",
        progress: { phase: "crawl", pagesProcessed: 12, pageLimit: 100 },
      },
      { db: db as never, now, leaseDurationMs: 90_000 },
    );

    expect(result).toEqual({
      cancelRequested: false,
      leaseExpiresAt: new Date("2026-07-25T08:01:30.000Z"),
    });
    expect(tx.seoAuditRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: { gt: now },
      },
      data: { leaseExpiresAt: new Date("2026-07-25T08:01:30.000Z") },
    });
    expect(tx.seoAuditWorkerHeartbeat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workerId: "worker-1" },
        update: expect.objectContaining({
          currentRunId: "run-1",
          metadata: {
            phase: "crawl",
            pagesProcessed: 12,
            pageLimit: 100,
          },
        }),
      }),
    );
  });

  it("turns a matching cancel request into cancelled and tells the worker to stop", async () => {
    const { db, tx } = createJobDb();
    const leaseToken = "lease-token-12345678901234567890";
    const leaseTokenHash = createHash("sha256").update(leaseToken).digest("hex");
    tx.seoAuditRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      status: "cancel_requested",
      leaseTokenHash,
      leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
    });
    tx.seoAuditRun.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.seoAuditWorkerHeartbeat.upsert.mockResolvedValueOnce({ id: "heartbeat-1" });

    await expect(
      heartbeatSeoAuditJob(
        {
          runId: "run-1",
          leaseToken,
          workerId: "worker-1",
          engineVersion: "1.4.4",
          progress: { phase: "cancel", pagesProcessed: 12, pageLimit: 100 },
        },
        { db: db as never, now },
      ),
    ).resolves.toEqual({ cancelRequested: true, leaseExpiresAt: null });
    expect(tx.seoAuditRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "cancelled",
          leaseTokenHash: null,
          leaseExpiresAt: null,
        }),
      }),
    );
  });

  it("rejects completion after cancellation before uploading artifacts", async () => {
    const { db } = createJobDb();
    db.seoAuditRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      status: "cancelled",
      leaseTokenHash: null,
      leaseExpiresAt: null,
      reportSha256: null,
    });
    const storeArtifacts = vi.fn();

    await expect(
      completeSeoAuditJob(
        {
          runId: "run-1",
          leaseToken: "lease-token-12345678901234567890",
          reportGzipBase64: "bundle",
        },
        { db: db as never, now, storeArtifacts },
      ),
    ).rejects.toMatchObject({ code: "JOB_CANCELLED" });
    expect(storeArtifacts).not.toHaveBeenCalled();
  });

  it("uploads first, then completes transactionally, and treats repeated completion as idempotent", async () => {
    const { db, tx } = createJobDb();
    const leaseToken = "lease-token-12345678901234567890";
    const leaseTokenHash = createHash("sha256").update(leaseToken).digest("hex");
    db.seoAuditRun.findUnique
      .mockResolvedValueOnce({
        id: "run-1",
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
        reportSha256: null,
      })
      .mockResolvedValueOnce({
        id: "run-1",
        status: "completed",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        reportSha256: "a".repeat(64),
      });
    tx.seoAuditRun.updateMany.mockResolvedValueOnce({ count: 1 });
    const storeArtifacts = vi.fn().mockResolvedValue({
      reportJsonKey: `seo-audit/runs/run-1/${"a".repeat(64)}/report.json`,
      reportMarkdownKey: `seo-audit/runs/run-1/${"a".repeat(64)}/report.md`,
      reportSha256: "a".repeat(64),
      engineVersion: "1.4.4",
      summary: {
        score: 88,
        evidenceCoverage: 92,
        pageCount: 10,
        criticalCount: 0,
        highCount: 2,
        mediumCount: 5,
        findings: [{ id: "f-1", severity: "high", issue: "Issue" }],
      },
    });

    const first = await completeSeoAuditJob(
      { runId: "run-1", leaseToken, reportGzipBase64: "bundle" },
      { db: db as never, now, storeArtifacts },
    );
    const repeated = await completeSeoAuditJob(
      { runId: "run-1", leaseToken, reportGzipBase64: "bundle" },
      { db: db as never, now, storeArtifacts },
    );

    expect(first).toEqual({ status: "completed", alreadyCompleted: false });
    expect(repeated).toEqual({ status: "completed", alreadyCompleted: true });
    expect(storeArtifacts).toHaveBeenCalledTimes(1);
    expect(tx.seoAuditRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: { gt: now },
        cancelRequestedAt: null,
      },
      data: expect.objectContaining({
        status: "completed",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        completedAt: now,
        engineVersion: "1.4.4",
        summaryScore: 88,
        summaryFindings: [
          { id: "f-1", severity: "high", issue: "Issue" },
        ],
        reportSha256: "a".repeat(64),
      }),
    });
  });

  it("fails idempotently and refunds a consumed credit exactly once for a system failure", async () => {
    const { db, tx } = createJobDb();
    const leaseToken = "lease-token-12345678901234567890";
    const leaseTokenHash = createHash("sha256").update(leaseToken).digest("hex");
    tx.seoAuditRun.findUnique
      .mockResolvedValueOnce({
        id: "run-1",
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
        creditId: "credit-1",
      })
      .mockResolvedValueOnce({
        id: "run-1",
        status: "failed",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        creditId: "credit-1",
      });
    tx.seoAuditRun.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.$executeRaw.mockResolvedValueOnce(1);

    const first = await failSeoAuditJob(
      { runId: "run-1", leaseToken, failureCode: "SYSTEM_TIMEOUT" },
      { db: db as never, now },
    );
    const repeated = await failSeoAuditJob(
      { runId: "run-1", leaseToken, failureCode: "SYSTEM_TIMEOUT" },
      { db: db as never, now },
    );

    expect(first).toEqual({ status: "failed", alreadyFailed: false });
    expect(repeated).toEqual({ status: "failed", alreadyFailed: true });
    expect(tx.seoAuditRun.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.seoAuditRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
          failureCode: "SYSTEM_TIMEOUT",
          failureMessage: "The audit worker timed out.",
        }),
      }),
    );
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const refundSql = rawSql(tx.$executeRaw.mock.calls[0][0]);
    expect(refundSql.sql).toMatch(
      /"remaining_runs"\s*=\s*"remaining_runs"\s*\+\s*1/,
    );
    expect(refundSql.sql).toMatch(
      /"remaining_runs"\s*<\s*"total_runs"/,
    );
    expect(JSON.stringify(tx.seoAuditRun.updateMany.mock.calls)).not.toContain(
      "https://",
    );
    expect(JSON.stringify(tx.seoAuditRun.updateMany.mock.calls)).not.toContain(
      leaseToken,
    );
  });

  it("moves queued jobs directly to cancelled and running jobs to cancel_requested", async () => {
    const { db, tx } = createJobDb();
    tx.seoAuditRun.findUnique
      .mockResolvedValueOnce({ id: "queued-run", status: "queued" })
      .mockResolvedValueOnce({ id: "running-run", status: "running" });
    tx.seoAuditRun.update.mockResolvedValue({ id: "updated" });

    await expect(
      requestSeoAuditJobCancellation("queued-run", { db: db as never, now }),
    ).resolves.toEqual({ status: "cancelled" });
    await expect(
      requestSeoAuditJobCancellation("running-run", { db: db as never, now }),
    ).resolves.toEqual({ status: "cancel_requested" });
  });
});
