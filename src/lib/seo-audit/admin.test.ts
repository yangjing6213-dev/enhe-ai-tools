import { describe, expect, it, vi } from "vitest";
import { seoAuditFunnelSteps } from "@/lib/analytics";
import {
  calculateSeoAuditAdminRates,
  cancelSeoAuditRunForAdmin,
  findExpiringSeoAuditSubscriptions,
  getSeoAuditAdminFunnelEvents,
  pauseSeoAuditScheduleForAdmin,
  retrySeoAuditRunForAdmin,
  summarizeSeoAuditCommercialOrders,
} from "@/lib/seo-audit/admin";

const now = new Date("2026-07-27T04:00:00.000Z");
const auditContext = { ip: "203.0.113.10", userAgent: "vitest" };

function createMutationDb() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "locked" }]),
    seoAuditRun: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "run-1" }),
    },
    seoAuditSubscription: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "subscription-1" }),
    },
    seoAuditSchedule: {
      update: vi.fn().mockResolvedValue({ id: "schedule-1" }),
    },
    adminAuditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };
  const db = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  return { db, tx };
}

function failedRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    status: "failed",
    kind: "professional",
    attemptCount: 3,
    failureCode: "SYSTEM_TIMEOUT",
    sourceOrder: null,
    credit: null,
    subscription: null,
    ...overrides,
  };
}

describe("SEO audit admin metrics", () => {
  it("uses the centralized analytics event table for visit, run, and pay", () => {
    const events = getSeoAuditAdminFunnelEvents();

    expect(Object.values(events).every((event) => seoAuditFunnelSteps.includes(event))).toBe(true);
  });

  it("returns zero percentages when metric denominators are zero", () => {
    expect(
      calculateSeoAuditAdminRates({
        terminalRuns: 0,
        failedRuns: 0,
        paidReportRuns: 0,
        deliveredPaidReports: 0,
      }),
    ).toEqual({ failureRate: 0, paidReportDeliveryRate: 0 });
  });

  it("excludes test and refunded orders from effective revenue", () => {
    const summary = summarizeSeoAuditCommercialOrders([
      {
        id: "paid",
        amount: "99.00",
        orderStatus: "activated",
        isTestData: false,
        offer: { id: "offer-pro", code: "professional", name: "专业版" },
        paymentTransaction: { status: "paid", refundedAt: null },
        refundRecords: [],
      },
      {
        id: "refunded",
        amount: "39.00",
        orderStatus: "refunded",
        isTestData: false,
        offer: { id: "offer-deep", code: "deep", name: "深度版" },
        paymentTransaction: {
          status: "refunded",
          refundedAt: new Date("2026-07-26T04:00:00.000Z"),
        },
        refundRecords: [{ status: "completed", amount: "39.00" }],
      },
      {
        id: "test",
        amount: "19.00",
        orderStatus: "paid",
        isTestData: true,
        offer: { id: "offer-pro", code: "professional", name: "专业版" },
        paymentTransaction: { status: "paid", refundedAt: null },
        refundRecords: [],
      },
    ]);

    expect(summary).toMatchObject({
      effectiveRevenue: 99,
      effectiveOrderCount: 1,
      refundAmount: 39,
      refundCount: 1,
      refundRate: 50,
    });
    expect(summary.offerMix).toEqual([
      { offerId: "offer-pro", code: "professional", name: "专业版", orders: 1, revenue: 99 },
    ]);
  });

  it("includes subscriptions expiring after now through the inclusive seven-day boundary", () => {
    const subscriptions = [
      { id: "at-now", status: "active", expiresAt: now },
      { id: "inside", status: "active", expiresAt: new Date(now.getTime() + 1) },
      { id: "at-boundary", status: "paused", expiresAt: new Date(now.getTime() + 7 * 86_400_000) },
      { id: "after-boundary", status: "active", expiresAt: new Date(now.getTime() + 7 * 86_400_000 + 1) },
      { id: "wrong-status", status: "expired", expiresAt: new Date(now.getTime() + 86_400_000) },
    ];

    expect(
      findExpiringSeoAuditSubscriptions(subscriptions, { now, windowDays: 7 }).map(
        (subscription) => subscription.id,
      ),
    ).toEqual(["inside", "at-boundary"]);
  });
});

describe("SEO audit admin task actions", () => {
  it("atomically requeues a failed run and clears retry-sensitive state", async () => {
    const { db, tx } = createMutationDb();
    tx.seoAuditRun.findUnique.mockResolvedValue(failedRun());

    await expect(
      retrySeoAuditRunForAdmin({
        db: db as never,
        runId: "run-1",
        adminId: "admin-1",
        now,
        auditContext,
      }),
    ).resolves.toEqual({ status: "queued" });

    expect(tx.seoAuditRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "queued",
        availableAt: now,
        attemptCount: 0,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        cancelRequestedAt: null,
        startedAt: null,
        completedAt: null,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
        engineVersion: null,
      },
    });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: "admin-1",
        action: "seo_audit.run.retry",
        targetType: "seo_audit_run",
        targetId: "run-1",
        summary: expect.any(String),
        metadata: expect.objectContaining({
          previousStatus: "failed",
          previousFailureCode: "SYSTEM_TIMEOUT",
        }),
      }),
    });
  });

  it.each(["queued", "running", "completed", "cancelled", "cancel_requested"])(
    "rejects retrying a %s run",
    async (status) => {
      const { db, tx } = createMutationDb();
      tx.seoAuditRun.findUnique.mockResolvedValue(failedRun({ status }));

      await expect(
        retrySeoAuditRunForAdmin({
          db: db as never,
          runId: "run-1",
          adminId: "admin-1",
          now,
        }),
      ).rejects.toMatchObject({
        code: "SEO_AUDIT_RETRY_NOT_ALLOWED",
      });
      expect(tx.seoAuditRun.update).not.toHaveBeenCalled();
      expect(tx.adminAuditLog.create).not.toHaveBeenCalled();
    },
  );

  it("rejects retrying a failed run funded by a refunded order", async () => {
    const { db, tx } = createMutationDb();
    tx.seoAuditRun.findUnique.mockResolvedValue(
      failedRun({
        sourceOrder: {
          orderStatus: "refunded",
          paymentTransaction: { status: "refunded", refundedAt: now },
          refundRecords: [{ status: "completed" }],
        },
      }),
    );

    await expect(
      retrySeoAuditRunForAdmin({
        db: db as never,
        runId: "run-1",
        adminId: "admin-1",
        now,
      }),
    ).rejects.toMatchObject({
      code: "SEO_AUDIT_RUN_REFUNDED",
    });
    expect(tx.seoAuditRun.update).not.toHaveBeenCalled();
    expect(tx.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it.each(["queued", "running"])(
    "delegates cancellation for a %s run and writes the audit in the transaction",
    async (status) => {
      const { db, tx } = createMutationDb();
      tx.seoAuditRun.findUnique.mockResolvedValue({ id: "run-1", status, kind: "professional" });
      const requestCancellation = vi.fn().mockResolvedValue({
        status: status === "queued" ? "cancelled" : "cancel_requested",
      });

      await cancelSeoAuditRunForAdmin({
        db: db as never,
        runId: "run-1",
        adminId: "admin-1",
        now,
        auditContext,
        requestCancellation: requestCancellation as never,
      });

      expect(requestCancellation).toHaveBeenCalledWith("run-1", {
        db: expect.objectContaining({ $transaction: expect.any(Function) }),
        now,
      });
      expect(tx.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: "admin-1",
          action: "seo_audit.run.cancel",
          targetType: "seo_audit_run",
          targetId: "run-1",
          metadata: expect.objectContaining({ previousStatus: status }),
        }),
      });
    },
  );

  it("rejects cancellation outside queued and running states", async () => {
    const { db, tx } = createMutationDb();
    tx.seoAuditRun.findUnique.mockResolvedValue({
      id: "run-1",
      status: "completed",
      kind: "professional",
    });
    const requestCancellation = vi.fn();

    await expect(
      cancelSeoAuditRunForAdmin({
        db: db as never,
        runId: "run-1",
        adminId: "admin-1",
        requestCancellation: requestCancellation as never,
      }),
    ).rejects.toMatchObject({
      code: "SEO_AUDIT_CANCEL_NOT_ALLOWED",
    });
    expect(requestCancellation).not.toHaveBeenCalled();
    expect(tx.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it.each(["active", "paused"])(
    "pauses an %s subscription and its schedule consistently",
    async (status) => {
      const { db, tx } = createMutationDb();
      tx.seoAuditSubscription.findUnique.mockResolvedValue({
        id: "subscription-1",
        status,
        schedule: { id: "schedule-1", enabled: true, nextRunAt: now },
      });

      await expect(
        pauseSeoAuditScheduleForAdmin({
          db: db as never,
          subscriptionId: "subscription-1",
          adminId: "admin-1",
          auditContext,
        }),
      ).resolves.toEqual({ status: "paused", scheduleId: "schedule-1" });

      expect(tx.seoAuditSubscription.update).toHaveBeenCalledWith({
        where: { id: "subscription-1" },
        data: { status: "paused" },
      });
      expect(tx.seoAuditSchedule.update).toHaveBeenCalledWith({
        where: { subscriptionId: "subscription-1" },
        data: { enabled: false, nextRunAt: null },
      });
      expect(tx.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: "admin-1",
          action: "seo_audit.schedule.pause",
          targetType: "seo_audit_subscription",
          targetId: "subscription-1",
          metadata: expect.objectContaining({ previousStatus: status, scheduleId: "schedule-1" }),
        }),
      });
    },
  );

  it("rejects pausing a schedule for an expired subscription", async () => {
    const { db, tx } = createMutationDb();
    tx.seoAuditSubscription.findUnique.mockResolvedValue({
      id: "subscription-1",
      status: "expired",
      schedule: { id: "schedule-1", enabled: true, nextRunAt: now },
    });

    await expect(
      pauseSeoAuditScheduleForAdmin({
        db: db as never,
        subscriptionId: "subscription-1",
        adminId: "admin-1",
      }),
    ).rejects.toMatchObject({
      code: "SEO_AUDIT_SCHEDULE_PAUSE_NOT_ALLOWED",
    });
    expect(tx.seoAuditSubscription.update).not.toHaveBeenCalled();
    expect(tx.seoAuditSchedule.update).not.toHaveBeenCalled();
    expect(tx.adminAuditLog.create).not.toHaveBeenCalled();
  });
});
