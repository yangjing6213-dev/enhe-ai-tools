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
const completionSummary = {
  score: 88,
  evidenceCoverage: 92,
  pageCount: 10,
  criticalCount: 0,
  highCount: 2,
  mediumCount: 5,
};
const parsedReport = {
  fullReport: {
    meta: {
      engine_version: "1.4.8",
      target: "https://example.com/path",
      max_pages: 100,
    },
    pages: Array.from({ length: 10 }, () => ({})),
    summary: { pages_crawled: 10 },
  },
  markdown: "# Report\n",
  reportSha256: "a".repeat(64),
  engineVersion: "1.4.8",
  targetUrl: "https://example.com/path",
  pageLimit: 100,
  summary: completionSummary,
  publicFindings: [
    {
      id: "F001",
      code: "missing_canonical",
      severity: "high" as const,
      issue: "Some pages are missing canonical tags.",
    },
  ],
};
const leaseToken = "lease-token-12345678901234567890";
const leaseTokenHash = createHash("sha256").update(leaseToken).digest("hex");
const reservation = `seo-audit-pending-upload:${now.getTime()}:${Buffer.alloc(
  24,
  1,
).toString("base64url")}`;
const reservationKeyHash = createHash("sha256")
  .update(reservation)
  .digest("hex");
const reportJsonKey = `seo-audit/runs/run-1/${"a".repeat(64)}/uploads/${reservationKeyHash}/report.json`;
const reportMarkdownKey = `seo-audit/runs/run-1/${"a".repeat(64)}/uploads/${reservationKeyHash}/report.md`;

function completionRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    status: "running",
    targetUrl: parsedReport.targetUrl,
    pageLimit: parsedReport.pageLimit,
    engineVersion: parsedReport.engineVersion,
    leaseTokenHash,
    leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
    reportJsonKey: null,
    reportMarkdownKey: null,
    reportSha256: null,
    summaryScore: null,
    summaryEvidenceCoverage: null,
    summaryPageCount: null,
    summaryCriticalCount: null,
    summaryHighCount: null,
    summaryMediumCount: null,
    ...overrides,
  };
}

function completedRun(overrides: Record<string, unknown> = {}) {
  return completionRun({
    status: "completed",
    leaseTokenHash: null,
    leaseExpiresAt: null,
    reportJsonKey,
    reportMarkdownKey,
    reportSha256: parsedReport.reportSha256,
    summaryScore: completionSummary.score,
    summaryEvidenceCoverage: completionSummary.evidenceCoverage,
    summaryPageCount: completionSummary.pageCount,
    summaryCriticalCount: completionSummary.criticalCount,
    summaryHighCount: completionSummary.highCount,
    summaryMediumCount: completionSummary.mediumCount,
    ...overrides,
  });
}

function createJobDb() {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn(),
    seoAuditRun: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    seoAuditArtifactUpload: {
      create: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
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
  it("rejects unsupported worker engine versions before opening a transaction", async () => {
    const { db } = createJobDb();

    await expect(
      claimSeoAuditJob(
        { workerId: "worker-1", engineVersion: "1.4.7" },
        { db: db as never, now },
      ),
    ).rejects.toMatchObject({ code: "ENGINE_VERSION_UNSUPPORTED" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("locks a paid candidate's order before atomically claiming it and stores only the lease hash", async () => {
    const { db, tx } = createJobDb();
    const leaseBytes = Buffer.alloc(32, 7);
    const expectedLease = leaseBytes.toString("base64url");
    const expectedHash = createHash("sha256")
      .update(expectedLease)
      .digest("hex");
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: "run-1", sourceOrderId: "order-1" }])
      .mockResolvedValueOnce([{ id: "order-1" }])
      .mockResolvedValueOnce([
        {
          id: "run-1",
          kind: "professional",
          targetUrl: "https://example.com/path",
          normalizedOrigin: "https://example.com",
          pageLimit: 100,
          totalTimeoutSeconds: 720,
          leaseExpiresAt: new Date("2026-07-25T08:01:30.000Z"),
          attemptCount: 1,
          engineVersion: "1.4.8",
        },
      ]);

    const job = await claimSeoAuditJob(
      { workerId: "worker-1", engineVersion: "1.4.8" },
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
      engineVersion: "1.4.8",
      kind: "professional",
      attemptCount: 1,
    });
    expect(job).not.toHaveProperty("leaseTokenHash");
    expect(job).not.toHaveProperty("publicTokenHash");
    expect(job).not.toHaveProperty("reportJsonKey");
    expect(job).not.toHaveProperty("requestIpHash");

    const candidateSql = rawSql(tx.$queryRaw.mock.calls[0][0]);
    expect(candidateSql.sql).toContain("available_at");
    expect(candidateSql.sql).toContain("created_at");
    expect(candidateSql.sql).toContain("professional");
    expect(candidateSql.sql).toContain("scheduled");
    expect(candidateSql.sql).toContain("free");
    expect(candidateSql.sql).toMatch(/EXTRACT\s*\(\s*EPOCH/i);

    const orderLockSql = rawSql(tx.$queryRaw.mock.calls[1][0]);
    expect(orderLockSql.sql).toContain('FROM "orders"');
    expect(orderLockSql.sql).toMatch(/FOR UPDATE\s+SKIP LOCKED/i);
    expect(orderLockSql.values).toContain("order-1");

    const claimSql = rawSql(tx.$queryRaw.mock.calls[2][0]);
    expect(claimSql.sql).toMatch(/FOR UPDATE\s+SKIP LOCKED/i);
    expect(claimSql.sql).toMatch(/"status"\s*=\s*'queued'/i);
    expect(claimSql.sql).toContain("lease_token_hash");
    expect(claimSql.sql).toMatch(
      /"attempt_count"\s*=\s*runs\."attempt_count"\s*\+\s*1/,
    );
    expect(claimSql.sql).toContain("source_order_id");
    expect(claimSql.sql).toContain("order_refund_records");
    expect(claimSql.sql).toContain("order_status");
    expect(claimSql.values).toContain(expectedHash);
    expect(claimSql.values).not.toContain(expectedLease);
  });

  it("commits expired lease recovery before opening the order-lock claim transaction", async () => {
    const { db, tx } = createJobDb();
    const transactionOperations: Array<{ execute: number; query: number }> = [];
    db.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => {
        const executeBefore = tx.$executeRaw.mock.calls.length;
        const queryBefore = tx.$queryRaw.mock.calls.length;
        const result = await callback(tx);
        transactionOperations.push({
          execute: tx.$executeRaw.mock.calls.length - executeBefore,
          query: tx.$queryRaw.mock.calls.length - queryBefore,
        });
        return result;
      },
    );
    tx.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      claimSeoAuditJob(
        { workerId: "worker-1", engineVersion: "1.4.8" },
        { db: db as never, now, randomBytes: () => Buffer.alloc(32, 1) },
      ),
    ).resolves.toBeNull();

    expect(transactionOperations).toEqual([
      { execute: 1, query: 0 },
      { execute: 0, query: 1 },
    ]);

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
    tx.seoAuditRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      status: "running",
      leaseTokenHash,
      leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
      engineVersion: "1.4.8",
    });
    tx.seoAuditRun.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.seoAuditWorkerHeartbeat.upsert.mockResolvedValueOnce({ id: "heartbeat-1" });

    const result = await heartbeatSeoAuditJob(
      {
        runId: "run-1",
        leaseToken,
        workerId: "worker-1",
        engineVersion: "1.4.8",
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
    tx.seoAuditRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      status: "cancel_requested",
      leaseTokenHash,
      leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
      engineVersion: "1.4.8",
    });
    tx.seoAuditRun.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.seoAuditWorkerHeartbeat.upsert.mockResolvedValueOnce({ id: "heartbeat-1" });

    await expect(
      heartbeatSeoAuditJob(
        {
          runId: "run-1",
          leaseToken,
          workerId: "worker-1",
          engineVersion: "1.4.8",
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

  it("gives cancel_requested priority before parsing or uploading and clears the lease", async () => {
    const { db, tx } = createJobDb();
    const cancellingRun = completionRun({
      status: "cancel_requested",
      reportJsonKey: reservation,
      reportSha256: parsedReport.reportSha256,
    });
    db.seoAuditRun.findUnique.mockResolvedValueOnce(cancellingRun);
    tx.$queryRaw.mockResolvedValueOnce([{ id: "run-1" }]);
    tx.seoAuditRun.findUnique.mockResolvedValueOnce(cancellingRun);
    tx.seoAuditRun.update.mockResolvedValueOnce({ id: "run-1" });
    const parseReport = vi.fn();
    const storeArtifacts = vi.fn();

    await expect(
      completeSeoAuditJob(
        {
          runId: "run-1",
          leaseToken: "lease-token-12345678901234567890",
          reportGzipBase64: "bundle",
          summary: completionSummary,
        },
        { db: db as never, now, parseReport, storeArtifacts },
      ),
    ).rejects.toMatchObject({ code: "JOB_CANCELLED" });
    expect(parseReport).not.toHaveBeenCalled();
    expect(storeArtifacts).not.toHaveBeenCalled();
    expect(tx.seoAuditRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "cancelled",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        reportJsonKey: null,
        reportMarkdownKey: null,
        reportSha256: null,
      }),
    });
  });

  it("runs first-completion lifecycle effects after commit and accepts a historical identical retry", async () => {
    const { db, tx } = createJobDb();
    db.seoAuditRun.findUnique
      .mockResolvedValueOnce(completionRun())
      .mockResolvedValueOnce(completedRun());
    tx.$queryRaw.mockResolvedValue([{ id: "run-1" }]);
    tx.seoAuditRun.findUnique
      .mockResolvedValueOnce(completionRun())
      .mockResolvedValueOnce(
        completionRun({
          reportJsonKey: reservation,
          reportSha256: parsedReport.reportSha256,
        }),
      );
    tx.seoAuditRun.update.mockResolvedValue({ id: "run-1" });
    const parseReport = vi.fn().mockResolvedValue(parsedReport);
    let transactionOpen = false;
    db.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => {
        transactionOpen = true;
        try {
          return await callback(tx);
        } finally {
          transactionOpen = false;
        }
      },
    );
    const notificationError = new Error("SMTP unavailable");
    const trackAnalyticsEvent = vi.fn().mockImplementation(async () => {
      expect(transactionOpen).toBe(false);
    });
    const notifyRunCompletion = vi.fn().mockImplementation(async () => {
      expect(transactionOpen).toBe(false);
      throw notificationError;
    });
    const reportLifecycleError = vi.fn();
    const storeArtifacts = vi
      .fn()
      .mockImplementation(async (input: Record<string, unknown>) => {
        expect(transactionOpen).toBe(false);
        return {
          reportJsonKey: input.reportJsonKey as string,
          reportMarkdownKey: input.reportMarkdownKey as string,
        };
      });

    const first = await completeSeoAuditJob(
      {
        runId: "run-1",
        leaseToken,
        reportGzipBase64: "bundle",
        summary: completionSummary,
      },
      {
        db: db as never,
        now,
        parseReport,
        storeArtifacts,
        randomBytes: () => Buffer.alloc(24, 1),
        trackAnalyticsEvent,
        notifyRunCompletion,
        reportLifecycleError,
      },
    );
    const repeated = await completeSeoAuditJob(
      {
        runId: "run-1",
        leaseToken: "historical-retry-with-cleared-lease",
        reportGzipBase64: "bundle",
        summary: completionSummary,
      },
      {
        db: db as never,
        now,
        parseReport,
        storeArtifacts,
        trackAnalyticsEvent,
        notifyRunCompletion,
        reportLifecycleError,
      },
    );

    expect(first).toEqual({ status: "completed", alreadyCompleted: false });
    expect(repeated).toEqual({ status: "completed", alreadyCompleted: true });
    expect(parseReport).toHaveBeenCalledTimes(2);
    expect(storeArtifacts).toHaveBeenCalledTimes(1);
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith({
      eventName: "seo_audit_completed",
      entityType: "seo_audit_run",
      entityId: "run-1",
      metadata: { runId: "run-1" },
      networkContext: { ip: null, userAgent: null },
    });
    expect(JSON.stringify(trackAnalyticsEvent.mock.calls)).not.toContain(
      "https://",
    );
    expect(JSON.stringify(trackAnalyticsEvent.mock.calls)).not.toContain(
      "# Report",
    );
    expect(notifyRunCompletion).toHaveBeenCalledTimes(1);
    expect(notifyRunCompletion).toHaveBeenCalledWith("run-1");
    expect(reportLifecycleError).toHaveBeenCalledWith(
      {
        effect: "notification",
        eventName: "seo_audit_completed",
        runId: "run-1",
      },
      notificationError,
    );
    expect(storeArtifacts).toHaveBeenCalledWith({
      runId: "run-1",
      parsed: parsedReport,
      reportJsonKey,
      reportMarkdownKey,
    });
    expect(tx.seoAuditArtifactUpload.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        runId: "run-1",
        reservation,
        reportSha256: parsedReport.reportSha256,
        reportJsonKey,
        reportMarkdownKey,
      }),
    });
    expect(tx.seoAuditArtifactUpload.deleteMany).toHaveBeenCalledWith({
      where: {
        runId: "run-1",
        reservation,
        reportJsonKey,
        reportMarkdownKey,
      },
    });
    const completionLockSql = rawSql(tx.$queryRaw.mock.calls[0][0]);
    expect(completionLockSql.sql).toMatch(/FOR UPDATE/i);
    expect(tx.seoAuditRun.update.mock.invocationCallOrder[0]).toBeLessThan(
      storeArtifacts.mock.invocationCallOrder[0],
    );
    expect(storeArtifacts.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$queryRaw.mock.invocationCallOrder[1],
    );
    expect(tx.seoAuditRun.update).toHaveBeenNthCalledWith(1, {
      where: { id: "run-1" },
      data: {
        reportSha256: parsedReport.reportSha256,
        reportJsonKey: reservation,
        reportMarkdownKey: null,
      },
    });
    expect(tx.seoAuditRun.update).toHaveBeenNthCalledWith(2, {
      where: { id: "run-1" },
      data: expect.objectContaining({
        status: "completed",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        completedAt: now,
        engineVersion: "1.4.8",
        summaryScore: 88,
        summaryFindings: parsedReport.publicFindings,
        reportSha256: "a".repeat(64),
      }),
    });
  });

  it("keeps uploaded artifacts when the finalize transaction result is ambiguous", async () => {
    const { db, tx } = createJobDb();
    db.seoAuditRun.findUnique.mockResolvedValueOnce(completionRun());
    tx.$queryRaw.mockResolvedValue([{ id: "run-1" }]);
    tx.seoAuditRun.findUnique
      .mockResolvedValueOnce(completionRun())
      .mockResolvedValueOnce(
        completionRun({
          reportJsonKey: reservation,
          reportSha256: parsedReport.reportSha256,
        }),
      );
    tx.seoAuditRun.update.mockResolvedValue({ id: "run-1" });
    const finalizeError = new Error("connection lost after commit");
    let transactionCall = 0;
    db.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => {
        transactionCall += 1;
        const result = await callback(tx);
        if (transactionCall === 2) throw finalizeError;
        return result;
      },
    );
    const removeArtifacts = vi.fn().mockResolvedValue(undefined);

    await expect(
      completeSeoAuditJob(
        {
          runId: "run-1",
          leaseToken,
          reportGzipBase64: "bundle",
          summary: completionSummary,
        },
        {
          db: db as never,
          now,
          parseReport: async () => parsedReport,
          storeArtifacts: async () => ({ reportJsonKey, reportMarkdownKey }),
          removeArtifacts,
          randomBytes: () => Buffer.alloc(24, 1),
        },
      ),
    ).rejects.toBe(finalizeError);
    expect(tx.seoAuditArtifactUpload.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.seoAuditRun.update).toHaveBeenCalledTimes(2);
    expect(removeArtifacts).not.toHaveBeenCalled();
  });

  it("rejects contradictory summaries and mismatched targets before reserving or uploading", async () => {
    const { db } = createJobDb();
    db.seoAuditRun.findUnique.mockResolvedValue(completionRun());
    const parseReport = vi
      .fn()
      .mockResolvedValueOnce(parsedReport)
      .mockResolvedValueOnce({
        ...parsedReport,
        targetUrl: "https://other-customer.example/",
      });
    const storeArtifacts = vi.fn();

    await expect(
      completeSeoAuditJob(
        {
          runId: "run-1",
          leaseToken,
          reportGzipBase64: "bundle",
          summary: { ...completionSummary, score: 99 },
        },
        { db: db as never, now, parseReport, storeArtifacts },
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });

    await expect(
      completeSeoAuditJob(
        {
          runId: "run-1",
          leaseToken,
          reportGzipBase64: "bundle",
          summary: completionSummary,
        },
        { db: db as never, now, parseReport, storeArtifacts },
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_BUNDLE" });
    expect(parseReport).toHaveBeenCalledTimes(2);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(storeArtifacts).not.toHaveBeenCalled();
  });

  it("rejects a completed retry whose stored artifact keys belong to another run", async () => {
    const { db } = createJobDb();
    db.seoAuditRun.findUnique.mockResolvedValueOnce(
      completedRun({
        reportJsonKey: `seo-audit/runs/other-run/${parsedReport.reportSha256}/uploads/${reservationKeyHash}/report.json`,
        reportMarkdownKey: `seo-audit/runs/other-run/${parsedReport.reportSha256}/uploads/${reservationKeyHash}/report.md`,
      }),
    );

    await expect(
      completeSeoAuditJob(
        {
          runId: "run-1",
          leaseToken: "historical-retry-with-cleared-lease",
          reportGzipBase64: "bundle",
          summary: completionSummary,
        },
        {
          db: db as never,
          now,
          parseReport: async () => parsedReport,
          storeArtifacts: vi.fn(),
        },
      ),
    ).rejects.toMatchObject({ code: "JOB_STATE_CONFLICT" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("accepts an identical completed retry and clears a historical stale lease", async () => {
    const { db, tx } = createJobDb();
    const historical = completedRun({
      leaseTokenHash,
      leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
    });
    db.seoAuditRun.findUnique.mockResolvedValueOnce(historical);
    tx.$queryRaw.mockResolvedValueOnce([{ id: "run-1" }]);
    tx.seoAuditRun.findUnique.mockResolvedValueOnce(historical);
    tx.seoAuditRun.update.mockResolvedValueOnce({ id: "run-1" });

    await expect(
      completeSeoAuditJob(
        {
          runId: "run-1",
          leaseToken: "historical-retry-with-different-lease",
          reportGzipBase64: "bundle",
          summary: completionSummary,
        },
        {
          db: db as never,
          now,
          parseReport: async () => parsedReport,
          storeArtifacts: vi.fn(),
        },
      ),
    ).resolves.toEqual({ status: "completed", alreadyCompleted: true });
    expect(tx.seoAuditRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { leaseTokenHash: null, leaseExpiresAt: null },
    });
  });

  it("rechecks lease expiry after the out-of-transaction artifact upload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      const { db, tx } = createJobDb();
      db.seoAuditRun.findUnique.mockResolvedValueOnce(completionRun());
      tx.$queryRaw.mockResolvedValue([{ id: "run-1" }]);
      tx.seoAuditRun.findUnique
        .mockResolvedValueOnce(completionRun())
        .mockResolvedValueOnce(
          completionRun({
            reportJsonKey: reservation,
            reportSha256: parsedReport.reportSha256,
          }),
        );
      tx.seoAuditRun.update.mockResolvedValue({ id: "run-1" });
      const removeArtifacts = vi.fn().mockResolvedValue(undefined);

      await expect(
        completeSeoAuditJob(
          {
            runId: "run-1",
            leaseToken,
            reportGzipBase64: "bundle",
            summary: completionSummary,
          },
          {
            db: db as never,
            parseReport: async () => parsedReport,
            storeArtifacts: async (input) => {
              vi.setSystemTime(new Date("2026-07-25T08:01:00.000Z"));
              const reserved = input as typeof input & {
                reportJsonKey: string;
                reportMarkdownKey: string;
              };
              return {
                reportJsonKey: reserved.reportJsonKey,
                reportMarkdownKey: reserved.reportMarkdownKey,
              };
            },
            removeArtifacts,
            randomBytes: () => Buffer.alloc(24, 1),
          },
        ),
      ).rejects.toMatchObject({ code: "LEASE_EXPIRED" });
      expect(removeArtifacts).toHaveBeenCalledWith({
        reportJsonKey,
        reportMarkdownKey,
      });
      expect(tx.seoAuditRun.update).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rolls back its reservation when artifact storage fails", async () => {
    const { db, tx } = createJobDb();
    db.seoAuditRun.findUnique.mockResolvedValueOnce(completionRun());
    tx.$queryRaw.mockResolvedValue([{ id: "run-1" }]);
    tx.seoAuditRun.findUnique
      .mockResolvedValueOnce(completionRun())
      .mockResolvedValueOnce(
        completionRun({
          reportJsonKey: reservation,
          reportSha256: parsedReport.reportSha256,
        }),
      );
    tx.seoAuditRun.update.mockResolvedValueOnce({ id: "run-1" });
    tx.seoAuditRun.updateMany.mockResolvedValueOnce({ count: 1 });
    const storeArtifacts = vi
      .fn()
      .mockRejectedValue({ code: "ARTIFACT_UPLOAD_FAILED" });

    await expect(
      completeSeoAuditJob(
        {
          runId: "run-1",
          leaseToken,
          reportGzipBase64: "bundle",
          summary: completionSummary,
        },
        {
          db: db as never,
          now,
          parseReport: async () => parsedReport,
          storeArtifacts,
          randomBytes: () => Buffer.alloc(24, 1),
        },
      ),
    ).rejects.toMatchObject({ code: "ARTIFACT_UPLOAD_FAILED" });
    expect(storeArtifacts).toHaveBeenCalledWith({
      runId: "run-1",
      parsed: parsedReport,
      reportJsonKey,
      reportMarkdownKey,
    });
    expect(tx.seoAuditRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        status: "running",
        leaseTokenHash,
        reportSha256: parsedReport.reportSha256,
        reportJsonKey: reservation,
      },
      data: {
        reportJsonKey: null,
        reportMarkdownKey: null,
        reportSha256: null,
      },
    });
  });

  it("fails idempotently and refunds a consumed credit exactly once for a system failure", async () => {
    const { db, tx } = createJobDb();
    let transactionOpen = false;
    db.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => {
        transactionOpen = true;
        try {
          return await callback(tx);
        } finally {
          transactionOpen = false;
        }
      },
    );
    tx.$queryRaw.mockResolvedValue([{ id: "run-1" }]);
    tx.seoAuditRun.findUnique
      .mockResolvedValueOnce({
        id: "run-1",
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
        creditId: "credit-1",
        failureCode: null,
      })
      .mockResolvedValueOnce({
        id: "run-1",
        status: "failed",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        creditId: "credit-1",
        failureCode: "SYSTEM_TIMEOUT",
      });
    tx.seoAuditRun.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.seoAuditRun.update.mockResolvedValueOnce({ id: "run-1" });
    tx.$executeRaw.mockResolvedValueOnce(1);
    const analyticsError = new Error("analytics unavailable");
    const trackAnalyticsEvent = vi.fn().mockImplementation(async () => {
      expect(transactionOpen).toBe(false);
      throw analyticsError;
    });
    const notifyRunFailure = vi.fn().mockImplementation(async () => {
      expect(transactionOpen).toBe(false);
    });
    const reportLifecycleError = vi.fn();

    const first = await failSeoAuditJob(
      { runId: "run-1", leaseToken, failureCode: "SYSTEM_TIMEOUT" },
      {
        db: db as never,
        now,
        trackAnalyticsEvent,
        notifyRunFailure,
        reportLifecycleError,
      },
    );
    const repeated = await failSeoAuditJob(
      { runId: "run-1", leaseToken, failureCode: "SYSTEM_TIMEOUT" },
      {
        db: db as never,
        now,
        trackAnalyticsEvent,
        notifyRunFailure,
        reportLifecycleError,
      },
    );

    expect(first).toEqual({ status: "failed", alreadyFailed: false });
    expect(repeated).toEqual({ status: "failed", alreadyFailed: true });
    expect(tx.seoAuditRun.updateMany).toHaveBeenCalledTimes(1);
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith({
      eventName: "seo_audit_failed",
      entityType: "seo_audit_run",
      entityId: "run-1",
      metadata: { runId: "run-1" },
      networkContext: { ip: null, userAgent: null },
    });
    expect(JSON.stringify(trackAnalyticsEvent.mock.calls)).not.toContain(
      "https://",
    );
    expect(JSON.stringify(trackAnalyticsEvent.mock.calls)).not.toContain(
      "# Report",
    );
    expect(notifyRunFailure).toHaveBeenCalledTimes(1);
    expect(notifyRunFailure).toHaveBeenCalledWith("run-1");
    expect(reportLifecycleError).toHaveBeenCalledWith(
      {
        effect: "analytics",
        eventName: "seo_audit_failed",
        runId: "run-1",
      },
      analyticsError,
    );
    expect(tx.seoAuditRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
          failureCode: "SYSTEM_TIMEOUT",
          failureMessage: "The audit worker timed out.",
          leaseTokenHash: null,
          leaseExpiresAt: null,
          reportJsonKey: null,
          reportMarkdownKey: null,
          reportSha256: null,
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

  it("turns cancel_requested into cancelled instead of allowing failure to win", async () => {
    const { db, tx } = createJobDb();
    const trackAnalyticsEvent = vi.fn();
    const notifyRunFailure = vi.fn();
    tx.$queryRaw.mockResolvedValueOnce([{ id: "run-1" }]);
    tx.seoAuditRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      status: "cancel_requested",
      leaseTokenHash,
      leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
      creditId: "credit-1",
      failureCode: null,
    });
    tx.seoAuditRun.update.mockResolvedValueOnce({ id: "run-1" });

    await expect(
      failSeoAuditJob(
        { runId: "run-1", leaseToken, failureCode: "SYSTEM_INTERNAL" },
        { db: db as never, now, trackAnalyticsEvent, notifyRunFailure },
      ),
    ).resolves.toEqual({ status: "cancelled", alreadyFailed: false });
    expect(tx.seoAuditRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "cancelled",
        cancelRequestedAt: now,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        reportJsonKey: null,
        reportMarkdownKey: null,
        reportSha256: null,
      },
    });
    expect(tx.seoAuditRun.updateMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
    expect(notifyRunFailure).not.toHaveBeenCalled();
  });

  it("moves queued jobs directly to cancelled and running jobs to cancel_requested", async () => {
    const { db, tx } = createJobDb();
    tx.$queryRaw.mockResolvedValue([{ id: "run" }]);
    tx.seoAuditRun.findUnique
      .mockResolvedValueOnce({
        id: "queued-run",
        status: "queued",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        reportSha256: null,
      })
      .mockResolvedValueOnce({
        id: "running-run",
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
        reportSha256: null,
      });
    tx.seoAuditRun.update.mockResolvedValue({ id: "run" });

    await expect(
      requestSeoAuditJobCancellation("queued-run", { db: db as never, now }),
    ).resolves.toEqual({ status: "cancelled" });
    await expect(
      requestSeoAuditJobCancellation("running-run", { db: db as never, now }),
    ).resolves.toEqual({ status: "cancel_requested" });
    expect(tx.seoAuditRun.update).toHaveBeenNthCalledWith(1, {
      where: { id: "queued-run" },
      data: {
        status: "cancelled",
        cancelRequestedAt: now,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        reportJsonKey: null,
        reportMarkdownKey: null,
        reportSha256: null,
      },
    });
    expect(tx.seoAuditRun.update).toHaveBeenNthCalledWith(2, {
      where: { id: "running-run" },
      data: { status: "cancel_requested", cancelRequestedAt: now },
    });
  });

  it("returns the terminal result idempotently and repairs a stale completed lease", async () => {
    const { db, tx } = createJobDb();
    tx.$queryRaw.mockResolvedValueOnce([{ id: "run-1" }]);
    tx.seoAuditRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      status: "completed",
      leaseTokenHash,
      leaseExpiresAt: new Date("2026-07-25T08:00:30.000Z"),
      reportSha256: parsedReport.reportSha256,
    });
    tx.seoAuditRun.update.mockResolvedValueOnce({ id: "run-1" });

    await expect(
      requestSeoAuditJobCancellation("run-1", { db: db as never, now }),
    ).resolves.toEqual({ status: "completed" });
    expect(tx.seoAuditRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: { leaseTokenHash: null, leaseExpiresAt: null },
    });
  });
});
