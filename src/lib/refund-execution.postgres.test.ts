import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeConfirmation: vi.fn(),
}));

vi.mock("@/lib/zpay-config", () => ({
  consumeZpayRefundConfirmation: mocks.consumeConfirmation,
}));
import {
  executeZpayRefund,
  markStaleZpayRefundDispatchesAmbiguous,
  resolveAmbiguousZpayRefund,
  retryZpayRefundFinalization,
} from "@/lib/refund-execution";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres("PostgreSQL payment refund execution", () => {
  let db: PrismaClient;
  let adminId: string;
  const userIds: string[] = [];
  const orderIds: string[] = [];
  const projectIds: string[] = [];
  const subscriptionIds: string[] = [];

  beforeEach(() => {
    mocks.consumeConfirmation.mockClear();
  });

  beforeAll(async () => {
    db = new PrismaClient({
      datasourceUrl: databaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
    const admin = await db.user.create({
      data: {
        email: `task6-admin-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        role: "admin",
        isTestData: true,
      },
      select: { id: true },
    });
    adminId = admin.id;
    userIds.push(admin.id);
  });

  afterAll(async () => {
    if (!db) return;
    if (orderIds.length) {
      await db.adminAuditLog.deleteMany({ where: { targetId: { in: orderIds } } });
      await db.seoAuditSchedule.deleteMany({ where: { subscriptionId: { in: subscriptionIds } } });
      await db.seoAuditSubscriptionOrder.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.seoAuditRun.deleteMany({ where: { sourceOrderId: { in: orderIds } } });
      await db.seoAuditCredit.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.orderRefundRecord.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (subscriptionIds.length) {
      await db.seoAuditSubscription.deleteMany({ where: { id: { in: subscriptionIds } } });
    }
    if (projectIds.length) {
      await db.seoAuditProject.deleteMany({ where: { id: { in: projectIds } } });
    }
    if (userIds.length) {
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await db.$disconnect();
  });

  async function createFixture(code: "professional" | "monitoring" = "professional") {
    const offer = await db.seoAuditOffer.findUniqueOrThrow({ where: { code } });
    const user = await db.user.create({
      data: {
        email: `task6-user-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        isTestData: true,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    const amount = code === "professional" ? "19.90" : "109.90";
    const order = await db.order.create({
      data: {
        orderNo: `TASK6-${randomUUID()}`,
        userId: user.id,
        orderType: code === "professional" ? "seo_audit_credit" : "seo_audit_monitoring",
        seoAuditOfferId: offer.id,
        seoAuditTargetOrigin: "https://example.com",
        amount,
        paymentMethod: "wechat",
        orderStatus: "activated",
        paidAt: new Date("2026-07-25T00:00:00.000Z"),
        activatedAt: new Date("2026-07-25T00:00:00.000Z"),
        isTestData: true,
      },
    });
    orderIds.push(order.id);
    const payment = await db.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: "zpay",
        providerTradeNo: `provider-${randomUUID()}`,
        paymentType: "wxpay",
        status: "paid",
        amount,
        paidAt: order.paidAt,
      },
    });
    if (code === "professional") {
      await db.seoAuditCredit.create({
        data: {
          userId: user.id,
          offerId: offer.id,
          orderId: order.id,
          runKind: "professional",
          pageLimit: offer.pageLimit,
          totalRuns: 2,
          remainingRuns: 2,
          expiresAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      });
    }
    const refund = await db.orderRefundRecord.create({
      data: {
        orderId: order.id,
        requesterId: user.id,
        amount,
        status: "pending",
        reason: "Task 6 integration test",
      },
    });
    return { offer, user, order, payment, refund };
  }

  const providerSuccess = () =>
    Promise.resolve({
      kind: "succeeded" as const,
      providerCode: "1",
      message: "accepted",
      payload: { code: "1", msg: "accepted" },
    });

  it("allows only one pending refund request per order", async () => {
    const fixture = await createFixture();
    await expect(
      db.orderRefundRecord.create({
        data: {
          orderId: fixture.order.id,
          adminId,
          amount: fixture.order.amount,
          status: "pending",
          reason: "duplicate pending request",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("claims concurrent admin execution once and finalizes payment, order, refund, audit, and credit atomically", async () => {
    const fixture = await createFixture();
    const providerRefund = vi.fn(providerSuccess);

    const results = await Promise.all([
      executeZpayRefund(
        {
          refundId: fixture.refund.id,
          adminId,
          note: "Approved after ownership check.",
          refundProofImage: "https://example.test/refund-proof.png",
        },
        { db, providerRefund, now: () => new Date("2026-07-25T01:00:00.000Z") },
      ),
      executeZpayRefund(
        {
          refundId: fixture.refund.id,
          adminId,
          note: "Approved after ownership check.",
          refundProofImage: "https://example.test/refund-proof.png",
        },
        { db, providerRefund, now: () => new Date("2026-07-25T01:00:00.000Z") },
      ),
    ]);

    expect(providerRefund).toHaveBeenCalledTimes(1);
    expect(mocks.consumeConfirmation).toHaveBeenCalledTimes(1);
    expect(mocks.consumeConfirmation).toHaveBeenCalledWith({
      refundId: fixture.refund.id,
      confirmationValue: undefined,
    });
    expect(results.filter((result) => result.changed)).toHaveLength(1);
    expect(results.map((result) => result.outcome)).toContain("finalized");
    expect(
      results.every((result) =>
        result.outcome === "finalized" || result.outcome === "already_processing",
      ),
    ).toBe(true);

    const [payment, order, refund, credit, auditCount] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
      db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: fixture.refund.id } }),
      db.seoAuditCredit.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
      db.adminAuditLog.count({
        where: { targetId: fixture.order.id, action: "order.refund.finalized" },
      }),
    ]);
    expect(payment).toMatchObject({
      status: "refunded",
      refundState: "finalized",
      refundDispatchCount: 1,
      refundRecordId: fixture.refund.id,
    });
    expect(order.orderStatus).toBe("refunded");
    expect(refund.status).toBe("completed");
    expect(refund.note).toBe("Approved after ownership check.");
    expect(refund.refundProofImage).toBe("https://example.test/refund-proof.png");
    expect(credit.remainingRuns).toBe(0);
    expect(credit.refundedAt).toBeInstanceOf(Date);
    expect(auditCount).toBe(1);
  }, 30_000);

  it("keeps entitlements when the provider rejects the refund", async () => {
    const fixture = await createFixture();
    const result = await executeZpayRefund(
      { refundId: fixture.refund.id, adminId },
      {
        db,
        providerRefund: vi.fn().mockResolvedValue({
          kind: "rejected",
          providerCode: "0",
          message: "rejected",
          payload: { code: "0", msg: "rejected" },
        }),
      },
    );

    expect(result).toEqual({ outcome: "provider_rejected", changed: true });
    await expect(
      executeZpayRefund(
        { refundId: fixture.refund.id, adminId },
        { db, providerRefund: vi.fn().mockRejectedValue(new Error("MUST_NOT_RETRY")) },
      ),
    ).resolves.toEqual({ outcome: "provider_rejected", changed: false });
    const [payment, order, refund, credit] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
      db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: fixture.refund.id } }),
      db.seoAuditCredit.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ]);
    expect(payment.refundState).toBe("provider_rejected");
    expect(payment.status).toBe("paid");
    expect(order.orderStatus).toBe("activated");
    expect(refund.status).toBe("rejected");
    expect(credit.remainingRuns).toBe(2);
  });

  it("rejects a second refund record after the payment is bound to a provider rejection", async () => {
    const fixture = await createFixture();
    await executeZpayRefund(
      { refundId: fixture.refund.id, adminId },
      {
        db,
        providerRefund: vi.fn().mockResolvedValue({
          kind: "rejected",
          providerCode: "0",
          message: "rejected",
          payload: { code: "0", msg: "rejected" },
        }),
      },
    );
    const secondRefund = await db.orderRefundRecord.create({
      data: {
        orderId: fixture.order.id,
        requesterId: fixture.user.id,
        amount: fixture.order.amount,
        status: "pending",
        reason: "Second refund attempt",
      },
    });
    const providerRefund = vi.fn();

    await expect(
      executeZpayRefund(
        { refundId: secondRefund.id, adminId },
        { db, providerRefund },
      ),
    ).rejects.toThrow("REFUND_PAYMENT_ALREADY_BOUND");
    expect(providerRefund).not.toHaveBeenCalled();
  });

  it("does not retry an ambiguous provider outcome", async () => {
    const fixture = await createFixture();
    const providerRefund = vi.fn().mockResolvedValue({
      kind: "ambiguous",
      errorCode: "timeout",
      detail: null,
    });

    await expect(
      executeZpayRefund({ refundId: fixture.refund.id, adminId }, { db, providerRefund }),
    ).resolves.toMatchObject({ outcome: "ambiguous" });
    await expect(
      executeZpayRefund({ refundId: fixture.refund.id, adminId }, { db, providerRefund }),
    ).resolves.toMatchObject({ outcome: "ambiguous" });
    expect(providerRefund).toHaveBeenCalledTimes(1);
    const payment = await db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } });
    const refund = await db.orderRefundRecord.findUniqueOrThrow({ where: { id: fixture.refund.id } });
    expect(payment.refundState).toBe("ambiguous");
    expect(refund.status).toBe("pending");
  });

  it("manually reconciles an ambiguous provider success and only finalizes locally", async () => {
    const fixture = await createFixture();
    const providerRefund = vi.fn().mockResolvedValue({
      kind: "ambiguous",
      errorCode: "timeout",
      detail: null,
    });
    await executeZpayRefund(
      { refundId: fixture.refund.id, adminId },
      { db, providerRefund },
    );

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: fixture.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Confirmed in provider dashboard.",
          providerRefundReference: "ZPAY-REFUND-AMBIGUOUS-10001",
          refundProofImage: "https://example.test/refund-proof.png",
        },
        { db, providerRefund },
      ),
    ).resolves.toMatchObject({ outcome: "finalized", changed: true });
    expect(providerRefund).toHaveBeenCalledTimes(1);

    const [payment, refund, credit] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: fixture.refund.id } }),
      db.seoAuditCredit.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ]);
    expect(payment.refundState).toBe("finalized");
    expect(payment.refundPayload).toMatchObject({
      kind: "manual-provider-refund-confirmation",
      provider: "zpay",
      providerRefundReference: "ZPAY-REFUND-AMBIGUOUS-10001",
      amount: fixture.order.amount.toFixed(2),
      refundProofImage: "https://example.test/refund-proof.png",
    });
    expect(refund.status).toBe("completed");
    expect(refund.note).toBe("Confirmed in provider dashboard.");
    expect(credit.remainingRuns).toBe(0);
  });

  it("rejects reuse of a manual provider refund reference across orders", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const providerRefundReference = `ZPAY-REFUND-${randomUUID()}`;

    await Promise.all([
      db.paymentTransaction.update({
        where: { id: first.payment.id },
        data: {
          refundState: "ambiguous",
          refundRecordId: first.refund.id,
          refundLastErrorCode: "provider-timeout",
        },
      }),
      db.paymentTransaction.update({
        where: { id: second.payment.id },
        data: {
          refundState: "ambiguous",
          refundRecordId: second.refund.id,
          refundLastErrorCode: "provider-timeout",
        },
      }),
    ]);

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: first.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Confirmed in the ZPAY merchant console.",
          providerRefundReference,
          refundProofImage: "https://example.test/first-refund-proof.png",
        },
        { db },
      ),
    ).resolves.toEqual({ outcome: "finalized", changed: true });

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: second.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Attempted reuse of the same provider reference.",
          providerRefundReference,
          refundProofImage: "https://example.test/second-refund-proof.png",
        },
        { db },
      ),
    ).rejects.toThrow("REFUND_PROVIDER_REFERENCE_REUSED");

    const [firstPayment, secondPayment, secondRefund] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: first.payment.id } }),
      db.paymentTransaction.findUniqueOrThrow({ where: { id: second.payment.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: second.refund.id } }),
    ]);
    expect(firstPayment).toMatchObject({
      refundState: "finalized",
      refundProviderReference: providerRefundReference,
    });
    expect(secondPayment).toMatchObject({
      refundState: "ambiguous",
      refundProviderReference: null,
    });
    expect(secondRefund).toMatchObject({
      status: "pending",
      note: null,
      refundProofImage: null,
    });
  });

  it("manually reconciles an ambiguous provider rejection without revoking entitlements", async () => {
    const fixture = await createFixture();
    const providerRefund = vi.fn().mockResolvedValue({
      kind: "ambiguous",
      errorCode: "network",
      detail: null,
    });
    await executeZpayRefund(
      { refundId: fixture.refund.id, adminId },
      { db, providerRefund },
    );

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: fixture.refund.id,
          adminId,
          resolution: "provider_rejected",
        },
        { db, providerRefund },
      ),
    ).resolves.toMatchObject({ outcome: "provider_rejected", changed: true });
    expect(providerRefund).toHaveBeenCalledTimes(1);

    const [payment, refund, credit] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: fixture.refund.id } }),
      db.seoAuditCredit.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ]);
    expect(payment.refundState).toBe("provider_rejected");
    expect(refund.status).toBe("rejected");
    expect(credit.remainingRuns).toBe(2);
  });

  it("marks only one concurrent manual rejection as changed", async () => {
    const fixture = await createFixture();
    await db.paymentTransaction.update({
      where: { id: fixture.payment.id },
      data: {
        refundState: "ambiguous",
        refundRecordId: fixture.refund.id,
        refundLastErrorCode: "provider-timeout",
      },
    });

    const results = await Promise.all([
      resolveAmbiguousZpayRefund(
        {
          refundId: fixture.refund.id,
          adminId,
          resolution: "provider_rejected",
          note: "Provider console shows no refund.",
        },
        { db },
      ),
      resolveAmbiguousZpayRefund(
        {
          refundId: fixture.refund.id,
          adminId,
          resolution: "provider_rejected",
          note: "Duplicate administrator submission.",
        },
        { db },
      ),
    ]);

    expect(results.map((result) => result.changed).sort()).toEqual([false, true]);
    expect(results).toEqual([
      expect.objectContaining({ outcome: "provider_rejected" }),
      expect.objectContaining({ outcome: "provider_rejected" }),
    ]);
  });

  it("rejects ambiguous reconciliation after the refund record is no longer pending", async () => {
    const fixture = await createFixture();
    await db.paymentTransaction.update({
      where: { id: fixture.payment.id },
      data: { refundState: "ambiguous", refundRecordId: fixture.refund.id },
    });
    await db.orderRefundRecord.update({
      where: { id: fixture.refund.id },
      data: { status: "completed", completedAt: new Date("2026-07-26T12:00:00.000Z") },
    });

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: fixture.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Must not bypass the completed record.",
        },
        { db },
      ),
    ).rejects.toThrow("REFUND_STATE_MISMATCH");
    await expect(
      db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
    ).resolves.toMatchObject({ refundState: "ambiguous" });
  });

  it("rejects local finalization when its refund record is no longer pending", async () => {
    const fixture = await createFixture();
    await db.paymentTransaction.update({
      where: { id: fixture.payment.id },
      data: { refundState: "provider_succeeded", refundRecordId: fixture.refund.id },
    });
    await db.orderRefundRecord.update({
      where: { id: fixture.refund.id },
      data: { status: "rejected" },
    });

    await expect(
      retryZpayRefundFinalization({ refundId: fixture.refund.id, adminId }, { db }),
    ).rejects.toThrow("REFUND_STATE_MISMATCH");
    await expect(
      db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
    ).resolves.toMatchObject({
      status: "paid",
      refundState: "provider_succeeded",
    });
  });

  it("does not overwrite stored provider evidence during local finalization", async () => {
    const fixture = await createFixture();
    const storedPayload = {
      kind: "manual-provider-refund-confirmation",
      provider: "zpay",
      providerRefundReference: "ZPAY-REFUND-STORED-10001",
      amount: fixture.order.amount.toFixed(2),
      confirmedAt: "2026-07-26T12:00:00.000Z",
      refundProofImage: "https://example.test/stored-proof.png",
    };
    await db.paymentTransaction.update({
      where: { id: fixture.payment.id },
      data: {
        refundState: "provider_succeeded",
        refundRecordId: fixture.refund.id,
        refundPayload: storedPayload,
      },
    });
    await db.orderRefundRecord.update({
      where: { id: fixture.refund.id },
      data: {
        note: "Stored provider verification.",
        refundProofImage: "https://example.test/stored-proof.png",
      },
    });

    await expect(
      retryZpayRefundFinalization(
        {
          refundId: fixture.refund.id,
          adminId,
          note: "Concurrent stale note must not win.",
          refundProofImage: "https://example.test/stale-proof.png",
        },
        { db, now: () => new Date("2026-07-26T12:05:00.000Z") },
      ),
    ).resolves.toEqual({ outcome: "finalized", changed: true });

    const [refund, payment] = await Promise.all([
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: fixture.refund.id } }),
      db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
    ]);
    expect(refund).toMatchObject({
      note: "Stored provider verification.",
      refundProofImage: "https://example.test/stored-proof.png",
    });
    expect(payment.refundPayload).toEqual(storedPayload);
  });

  it("retries only local finalization after provider success was persisted", async () => {
    const fixture = await createFixture("monitoring");
    const providerRefund = vi.fn(providerSuccess);

    await expect(
      executeZpayRefund({ refundId: fixture.refund.id, adminId }, { db, providerRefund }),
    ).resolves.toMatchObject({ outcome: "finalize_retry" });
    expect(providerRefund).toHaveBeenCalledTimes(1);

    const project = await db.seoAuditProject.create({
      data: {
        userId: fixture.user.id,
        normalizedOrigin: "https://example.com",
        displayUrl: "https://example.com",
      },
    });
    projectIds.push(project.id);
    const subscription = await db.seoAuditSubscription.create({
      data: {
        userId: fixture.user.id,
        projectId: project.id,
        offerId: fixture.offer.id,
        status: "active",
        startsAt: new Date("2026-07-25T00:00:00.000Z"),
        expiresAt: new Date("2026-08-24T00:00:00.000Z"),
        maxScheduledRuns: 5,
        manualRunsRemaining: 2,
      },
    });
    subscriptionIds.push(subscription.id);
    await db.seoAuditSubscriptionOrder.create({
      data: {
        subscriptionId: subscription.id,
        orderId: fixture.order.id,
        serviceStartsAt: subscription.startsAt,
        serviceEndsAt: subscription.expiresAt,
        scheduledRunsGranted: 5,
        manualRunsGranted: 2,
      },
    });

    await expect(
      retryZpayRefundFinalization(
        { refundId: fixture.refund.id, adminId },
        { db, providerRefund },
      ),
    ).resolves.toMatchObject({ outcome: "finalized", changed: true });
    await expect(
      retryZpayRefundFinalization(
        { refundId: fixture.refund.id, adminId },
        { db, providerRefund },
      ),
    ).resolves.toMatchObject({ outcome: "finalized", changed: false });
    expect(providerRefund).toHaveBeenCalledTimes(1);
    const payment = await db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } });
    expect(payment.refundState).toBe("finalized");
  });

  it("moves stale dispatching claims to ambiguous and never back to requested", async () => {
    const fixture = await createFixture();
    const otherFixture = await createFixture();
    await db.paymentTransaction.update({
      where: { id: fixture.payment.id },
      data: {
        refundState: "dispatching",
        refundRecordId: fixture.refund.id,
        refundDispatchCount: 1,
        refundRequestedAt: new Date("2026-07-24T20:00:00.000Z"),
        refundDispatchStartedAt: new Date("2026-07-24T20:01:00.000Z"),
      },
    });
    await db.paymentTransaction.update({
      where: { id: otherFixture.payment.id },
      data: {
        refundState: "dispatching",
        refundRecordId: otherFixture.refund.id,
        refundDispatchCount: 1,
        refundRequestedAt: new Date("2026-07-24T20:00:00.000Z"),
        refundDispatchStartedAt: new Date("2026-07-24T20:01:00.000Z"),
      },
    });

    await expect(
      markStaleZpayRefundDispatchesAmbiguous(
        {
          refundId: fixture.refund.id,
          startedBefore: new Date("2026-07-24T21:00:00.000Z"),
        },
        { db, now: () => new Date("2026-07-25T01:00:00.000Z") },
      ),
    ).resolves.toEqual({ markedAmbiguous: 1 });
    const [payment, otherPayment] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: fixture.payment.id } }),
      db.paymentTransaction.findUniqueOrThrow({ where: { id: otherFixture.payment.id } }),
    ]);
    expect(payment.refundState).toBe("ambiguous");
    expect(payment.refundDispatchCount).toBe(1);
    expect(otherPayment.refundState).toBe("dispatching");
  });
});
