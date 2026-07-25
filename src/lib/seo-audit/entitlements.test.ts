import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeSeoAuditCreditAndEnqueue,
  enqueueAnonymousFreeAudit,
  enqueueDueSeoAuditSchedules,
  grantSeoAuditCreditForPaidOrder,
  hashAnonymousAuditIdentifier,
  normalizeSeoAuditTarget,
} from "@/lib/seo-audit/entitlements";

const now = new Date("2026-07-25T08:00:00.000Z");
const hmacSecret = "anonymous-audit-secret-with-32-bytes";

function createEntitlementDb() {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn(),
    order: {
      findUnique: vi.fn(),
    },
    seoAuditCredit: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    seoAuditOffer: {
      findUnique: vi.fn(),
    },
    seoAuditRun: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    seoAuditSchedule: {
      update: vi.fn(),
    },
  };
  const db = {
    $transaction: vi.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  return { db, tx };
}

function rawSql(call: unknown) {
  return call as { sql: string; values: unknown[] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SEO audit target validation", () => {
  it("normalizes public HTTP targets before any entitlement mutation", () => {
    expect(
      normalizeSeoAuditTarget("HTTPS://Example.COM:443/path?q=1#fragment"),
    ).toEqual({
      targetUrl: "https://example.com/path?q=1",
      normalizedOrigin: "https://example.com",
    });
  });

  it.each([
    "ftp://example.com",
    "http://localhost",
    "http://127.0.0.1",
    "http://10.1.2.3",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]",
    "https://user:password@example.com",
  ])("rejects unsafe or invalid targets: %s", (targetUrl) => {
    expect(() => normalizeSeoAuditTarget(targetUrl)).toThrowError(
      expect.objectContaining({ code: "INVALID_TARGET" }),
    );
  });

  it("rejects an invalid target before attempting to decrement credit", async () => {
    const { db } = createEntitlementDb();

    await expect(
      consumeSeoAuditCreditAndEnqueue(
        {
          userId: "user-1",
          creditId: "credit-1",
          kind: "professional",
          targetUrl: "http://127.0.0.1/private",
        },
        { db: db as never, now },
      ),
    ).rejects.toMatchObject({ code: "INVALID_TARGET" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("atomic paid entitlements", () => {
  it("decrements a live professional/deep credit conditionally and creates the run in one transaction", async () => {
    const { db, tx } = createEntitlementDb();
    tx.seoAuditCredit.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.seoAuditCredit.findUnique.mockResolvedValueOnce({
      offerId: "seo-audit-professional",
      orderId: "server-order-1",
      pageLimit: 100,
    });
    tx.seoAuditRun.create.mockResolvedValueOnce({ id: "run-1" });

    const result = await consumeSeoAuditCreditAndEnqueue(
      {
        userId: "user-1",
        creditId: "credit-1",
        kind: "professional",
        targetUrl: "https://example.com/path",
      },
      { db: db as never, now },
    );

    expect(result).toEqual({ runId: "run-1" });
    expect(tx.seoAuditCredit.updateMany).toHaveBeenCalledWith({
      where: {
        id: "credit-1",
        userId: "user-1",
        runKind: "professional",
        remainingRuns: { gt: 0 },
        expiresAt: { gt: now },
        refundedAt: null,
      },
      data: { remainingRuns: { decrement: 1 } },
    });
    expect(tx.seoAuditRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        creditId: "credit-1",
        offerId: "seo-audit-professional",
        sourceOrderId: "server-order-1",
        kind: "professional",
        targetUrl: "https://example.com/path",
        normalizedOrigin: "https://example.com",
        status: "queued",
      }),
      select: { id: true },
    });
  });

  it("never creates a run when the conditional credit decrement affects zero rows", async () => {
    const { db, tx } = createEntitlementDb();
    tx.seoAuditCredit.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      consumeSeoAuditCreditAndEnqueue(
        {
          userId: "user-1",
          creditId: "credit-1",
          kind: "deep",
          targetUrl: "https://example.com",
        },
        { db: db as never, now },
      ),
    ).rejects.toMatchObject({ code: "ENTITLEMENT_UNAVAILABLE" });
    expect(tx.seoAuditRun.create).not.toHaveBeenCalled();
  });

  it("grants an idempotent credit from the paid order's server-owned offer", async () => {
    const { db, tx } = createEntitlementDb();
    tx.order.findUnique.mockResolvedValueOnce({
      id: "order-1",
      userId: "user-1",
      orderType: "seo_audit_credit",
      orderStatus: "paid",
      paidAt: now,
      seoAuditCredit: null,
      seoAuditOffer: {
        id: "seo-audit-professional",
        code: "professional",
        includedRuns: 2,
        pageLimit: 100,
        validityDays: 7,
      },
    });
    tx.seoAuditCredit.create.mockResolvedValueOnce({ id: "credit-1" });

    await expect(
      grantSeoAuditCreditForPaidOrder("order-1", { db: db as never, now }),
    ).resolves.toEqual({ creditId: "credit-1", alreadyGranted: false });
    expect(tx.seoAuditCredit.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        offerId: "seo-audit-professional",
        orderId: "order-1",
        runKind: "professional",
        pageLimit: 100,
        totalRuns: 2,
        remainingRuns: 2,
        expiresAt: new Date("2026-08-01T08:00:00.000Z"),
      },
      select: { id: true },
    });
  });
});

describe("anonymous free audit limits and cache", () => {
  it("creates 64-character lowercase HMAC-SHA-256 identifiers", () => {
    const expected = createHmac("sha256", hmacSecret)
      .update("203.0.113.10")
      .digest("hex");
    const actual = hashAnonymousAuditIdentifier(
      "203.0.113.10",
      hmacSecret,
    );

    expect(actual).toBe(expected);
    expect(actual).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not touch paid credit when enqueuing a free run and never persists the raw IP", async () => {
    const { db, tx } = createEntitlementDb();
    tx.seoAuditOffer.findUnique.mockResolvedValueOnce({
      id: "seo-audit-free",
      pageLimit: 10,
      publicFindingLimit: 3,
    });
    tx.seoAuditRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.seoAuditRun.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    tx.seoAuditRun.create.mockResolvedValueOnce({ id: "free-run-1" });

    const result = await enqueueAnonymousFreeAudit(
      {
        ipAddress: "203.0.113.10",
        targetUrl: "https://example.com/path",
        publicToken: "public-token-12345678901234567890",
        engineVersion: "1.4.8",
      },
      { db: db as never, now, hmacSecret },
    );

    expect(result).toEqual({ runId: "free-run-1", cached: false });
    expect(tx.seoAuditCredit.updateMany).not.toHaveBeenCalled();
    expect(tx.seoAuditRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "free",
        status: "queued",
        requestIpHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        requestOriginHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        publicTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      select: { id: true },
    });
    expect(JSON.stringify(tx.seoAuditRun.create.mock.calls)).not.toContain(
      "203.0.113.10",
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(4);
    for (const call of tx.$queryRaw.mock.calls) {
      const sql = rawSql(call[0]).sql;
      expect(sql).toContain("pg_advisory_xact_lock");
      expect(sql).toMatch(
        /pg_advisory_xact_lock\([\s\S]+\)\s+IS\s+NULL\s+AS\s+"lockAcquired"/i,
      );
    }
  });

  it.each([
    { counts: [3, 0, 0], code: "IP_DAILY_LIMIT" },
    { counts: [0, 5, 0], code: "ORIGIN_DAILY_LIMIT" },
    { counts: [0, 0, 50], code: "QUEUE_CAPACITY_REACHED" },
  ])("enforces $code with database-serialized checks", async ({ counts, code }) => {
    const { db, tx } = createEntitlementDb();
    tx.seoAuditOffer.findUnique.mockResolvedValueOnce({
      id: "seo-audit-free",
      pageLimit: 10,
      publicFindingLimit: 3,
    });
    tx.seoAuditRun.findFirst.mockResolvedValueOnce(null);
    tx.seoAuditRun.count
      .mockResolvedValueOnce(counts[0])
      .mockResolvedValueOnce(counts[1])
      .mockResolvedValueOnce(counts[2]);

    await expect(
      enqueueAnonymousFreeAudit(
        {
          ipAddress: "203.0.113.10",
          targetUrl: "https://example.com",
          publicToken: "public-token-12345678901234567890",
          engineVersion: "1.4.4",
        },
        { db: db as never, now, hmacSecret },
      ),
    ).rejects.toMatchObject({ code });
    expect(tx.seoAuditRun.create).not.toHaveBeenCalled();
  });

  it("rejects a second active run for the same public token", async () => {
    const { db, tx } = createEntitlementDb();
    tx.seoAuditOffer.findUnique.mockResolvedValueOnce({
      id: "seo-audit-free",
      pageLimit: 10,
      publicFindingLimit: 3,
    });
    tx.seoAuditRun.findFirst.mockResolvedValueOnce({ id: "active-run" });

    await expect(
      enqueueAnonymousFreeAudit(
        {
          ipAddress: "203.0.113.10",
          targetUrl: "https://example.com",
          publicToken: "public-token-12345678901234567890",
          engineVersion: "1.4.4",
        },
        { db: db as never, now, hmacSecret },
      ),
    ).rejects.toMatchObject({ code: "PUBLIC_TOKEN_ACTIVE" });
  });

  it("clones a same-origin completed result from the last 24 hours when the engine version matches", async () => {
    const { db, tx } = createEntitlementDb();
    tx.seoAuditOffer.findUnique.mockResolvedValueOnce({
      id: "seo-audit-free",
      pageLimit: 10,
      publicFindingLimit: 3,
    });
    tx.seoAuditRun.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "cached-run",
        completedAt: new Date("2026-07-25T07:00:00.000Z"),
        engineVersion: "1.4.8",
        summaryScore: 90,
        summaryEvidenceCoverage: 80,
        summaryPageCount: 10,
        summaryCriticalCount: 0,
        summaryHighCount: 1,
        summaryMediumCount: 2,
        summaryFindings: [
          {
            id: "F001",
            code: "missing_canonical",
            severity: "high",
            issue: "Some pages are missing canonical tags.",
          },
          {
            id: "F002",
            code: "missing_title",
            severity: "high",
            issue: "https://private.example/report?token=must-not-leak",
          },
          {
            id: "https://private.example/report?token=must-not-leak",
            code: "missing_title",
            severity: "high",
            issue: "Some pages are missing titles.",
          },
        ],
        reportJsonKey: "private/report.json",
        reportMarkdownKey: "private/report.md",
        reportSha256: "a".repeat(64),
      });
    tx.seoAuditRun.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    tx.seoAuditRun.create.mockResolvedValueOnce({ id: "cache-clone" });

    await expect(
      enqueueAnonymousFreeAudit(
        {
          ipAddress: "203.0.113.10",
          targetUrl: "https://example.com/new-path",
          publicToken: "public-token-12345678901234567890",
          engineVersion: "1.4.8",
        },
        { db: db as never, now, hmacSecret },
      ),
    ).resolves.toEqual({ runId: "cache-clone", cached: true });
    expect(tx.seoAuditRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "completed",
        engineVersion: "1.4.8",
        summaryFindings: [
          {
            id: "F001",
            code: "missing_canonical",
            severity: "high",
            issue: "Some pages are missing canonical tags.",
          },
        ],
        reportJsonKey: "private/report.json",
        reportMarkdownKey: "private/report.md",
        reportSha256: "a".repeat(64),
      }),
      select: { id: true },
    });
  });
});

describe("scheduled audit entitlements", () => {
  it("locks due schedules and enqueues only active, unexpired subscriptions with remaining quota", async () => {
    const { db, tx } = createEntitlementDb();
    tx.$queryRaw
      .mockResolvedValueOnce([
        {
          scheduleId: "schedule-1",
          subscriptionId: "subscription-1",
          userId: "user-1",
          projectId: "project-1",
          offerId: "seo-audit-monitoring",
          targetUrl: "https://example.com",
          pageLimit: 100,
          cadence: "weekly",
          nextRunAt: new Date("2026-07-25T07:59:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([{ id: "subscription-1" }]);
    tx.seoAuditRun.create.mockResolvedValueOnce({ id: "scheduled-run-1" });
    tx.seoAuditSchedule.update.mockResolvedValueOnce({ id: "schedule-1" });

    await expect(
      enqueueDueSeoAuditSchedules(
        { limit: 10 },
        { db: db as never, now },
      ),
    ).resolves.toEqual({ enqueued: 1 });

    const selectSql = rawSql(tx.$queryRaw.mock.calls[0][0]);
    expect(selectSql.sql).toMatch(/FOR UPDATE[\s\S]+SKIP LOCKED/i);
    expect(selectSql.sql).toContain("subscriptions.status = 'active'");
    expect(selectSql.sql).toContain("subscriptions.expires_at");
    expect(selectSql.sql).toContain(
      "subscriptions.scheduled_runs_used < subscriptions.max_scheduled_runs",
    );
    const consumeSql = rawSql(tx.$queryRaw.mock.calls[1][0]);
    expect(consumeSql.sql).toContain("scheduled_runs_used + 1");
    expect(consumeSql.sql).toContain("status = 'active'");
    expect(tx.seoAuditRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "scheduled",
        subscriptionId: "subscription-1",
        projectId: "project-1",
        status: "queued",
      }),
      select: { id: true },
    });
  });
});
