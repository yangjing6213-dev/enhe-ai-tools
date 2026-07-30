import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  canTransitionPaymentRefundState,
  executeZpayRefund,
  getRefundReviewStatusForPaymentState,
  retryZpayRefundFinalization,
  sanitizeRefundErrorDetail,
} from "@/lib/refund-execution";

const refundExecutionSource = readFileSync(
  join(process.cwd(), "src/lib/refund-execution.ts"),
  "utf8",
);

function createVipRefundDatabase(refundState: null | "provider_succeeded") {
  const amount = new Prisma.Decimal("19.90");
  const activatedAt = new Date("2026-07-25T00:00:00.000Z");
  const refund = {
    id: "refund-1",
    status: "pending",
    amount,
    completedAt: null,
    order: {
      id: "order-1",
      orderNo: "ORDER-1",
      userId: "user-1",
      orderType: "vip",
      orderStatus: "activated",
      toolId: null,
      amount,
      paidAt: activatedAt,
      activatedAt,
      paymentTransaction: {
        id: "payment-1",
        provider: "zpay",
        status: "paid",
        amount,
        refundRecordId: refundState ? "refund-1" : null,
        refundState,
        refundDispatchCount: refundState ? 1 : 0,
        refundedAt: null
      }
    }
  };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "order-1" }]),
    orderRefundRecord: {
      findUnique: vi.fn().mockImplementation(({ select }) => select
        ? { orderId: "order-1", order: { orderType: "vip", userId: "user-1" } }
        : refund),
      update: vi.fn()
    },
    order: {
      findFirst: vi.fn().mockResolvedValue({ id: "order-2" }),
      update: vi.fn()
    },
    vipAdjustmentLog: {
      findFirst: vi.fn().mockResolvedValue(null)
    },
    membership: {
      findFirst: vi.fn().mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        vipType: "VIP",
        startTime: activatedAt,
        endTime: new Date("2026-08-24T00:00:00.000Z"),
        isLifetime: false,
        status: "active"
      }),
      update: vi.fn()
    },
    paymentTransaction: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn()
    },
    toolPurchase: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    seoAuditCredit: { updateMany: vi.fn() },
    seoAuditSubscriptionOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    seoAuditSubscription: { update: vi.fn() },
    seoAuditSchedule: { updateMany: vi.fn() },
    seoAuditRun: { count: vi.fn(), updateMany: vi.fn() },
    adminAuditLog: { create: vi.fn() }
  };
  const db = {
    $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
  } as unknown as PrismaClient;
  return { db, tx, refund };
}

describe("payment refund state transitions", () => {
  it("locks the order before the payment row during local finalization", () => {
    const finalizeSource = refundExecutionSource.slice(
      refundExecutionSource.indexOf("async function finalizeRefund"),
      refundExecutionSource.indexOf("export async function executeZpayRefund"),
    );
    expect(finalizeSource.indexOf("FROM orders")).toBeGreaterThan(-1);
    expect(finalizeSource.indexOf("FROM payment_transactions")).toBeGreaterThan(-1);
    expect(finalizeSource.indexOf("FROM orders")).toBeLessThan(
      finalizeSource.indexOf("FROM payment_transactions"),
    );
  });

  it("locks the order, payment, and refund rows before claiming provider dispatch", () => {
    const claimSource = refundExecutionSource.slice(
      refundExecutionSource.indexOf("async function claimRefundDispatch"),
      refundExecutionSource.indexOf("async function persistProviderResult"),
    );
    const orderLock = claimSource.indexOf("FROM orders");
    const paymentLock = claimSource.indexOf("FROM payment_transactions");
    const refundLock = claimSource.indexOf("FROM order_refund_records");

    expect(orderLock).toBeGreaterThan(-1);
    expect(paymentLock).toBeGreaterThan(orderLock);
    expect(refundLock).toBeGreaterThan(paymentLock);
  });

  it("allows only the approved seven-state transitions", () => {
    expect(canTransitionPaymentRefundState(null, "requested")).toBe(true);
    expect(canTransitionPaymentRefundState("requested", "dispatching")).toBe(true);
    expect(canTransitionPaymentRefundState("dispatching", "provider_succeeded")).toBe(true);
    expect(canTransitionPaymentRefundState("dispatching", "provider_rejected")).toBe(true);
    expect(canTransitionPaymentRefundState("dispatching", "ambiguous")).toBe(true);
    expect(canTransitionPaymentRefundState("provider_succeeded", "finalized")).toBe(true);
    expect(canTransitionPaymentRefundState("provider_succeeded", "finalize_retry")).toBe(true);
    expect(canTransitionPaymentRefundState("finalize_retry", "finalized")).toBe(true);
    expect(canTransitionPaymentRefundState("ambiguous", "provider_succeeded")).toBe(true);
    expect(canTransitionPaymentRefundState("ambiguous", "provider_rejected")).toBe(true);

    expect(canTransitionPaymentRefundState(null, "dispatching")).toBe(false);
    expect(canTransitionPaymentRefundState("requested", "provider_succeeded")).toBe(false);
    expect(canTransitionPaymentRefundState("dispatching", "requested")).toBe(false);
    expect(canTransitionPaymentRefundState("ambiguous", "dispatching")).toBe(false);
    expect(canTransitionPaymentRefundState("provider_rejected", "requested")).toBe(false);
    expect(canTransitionPaymentRefundState("finalized", "finalize_retry")).toBe(false);
  });

  it("maps only finalized to completed and provider rejection to rejected", () => {
    expect(getRefundReviewStatusForPaymentState("finalized")).toBe("completed");
    expect(getRefundReviewStatusForPaymentState("provider_rejected")).toBe("rejected");
    for (const state of [
      "requested",
      "dispatching",
      "provider_succeeded",
      "finalize_retry",
      "ambiguous",
    ] as const) {
      expect(getRefundReviewStatusForPaymentState(state)).toBe("pending");
    }
  });

  it("stores a short single-line error detail without provider response bodies", () => {
    const detail = sanitizeRefundErrorDetail(` first line\n${"x".repeat(400)} `);
    expect(detail).not.toContain("\n");
    expect(Buffer.byteLength(detail ?? "", "utf8")).toBeLessThanOrEqual(256);
    expect(sanitizeRefundErrorDetail("   ")).toBeNull();
  });

  it("blocks an unsafe VIP refund before calling ZPAY", async () => {
    const { db, tx } = createVipRefundDatabase(null);
    const providerRefund = vi.fn().mockRejectedValue(new Error("PROVIDER_CALLED"));

    await expect(
      executeZpayRefund(
        { refundId: "refund-1", adminId: "admin-1" },
        { db, providerRefund }
      )
    ).rejects.toThrow("VIP_REFUND_RECONCILIATION_REQUIRED");

    expect(providerRefund).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(4);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.order.findFirst.mock.invocationCallOrder[0]
    );
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled();
    expect(tx.membership.update).not.toHaveBeenCalled();
  });

  it("sees a committed manual VIP grant after taking the user lock", async () => {
    const { db, tx } = createVipRefundDatabase(null);
    tx.order.findFirst.mockResolvedValue(null);
    tx.vipAdjustmentLog.findFirst.mockResolvedValue({ id: "adjustment-1" });
    const providerRefund = vi.fn().mockRejectedValue(new Error("PROVIDER_CALLED"));

    await expect(
      executeZpayRefund(
        { refundId: "refund-1", adminId: "admin-1" },
        { db, providerRefund }
      )
    ).rejects.toThrow("VIP_REFUND_RECONCILIATION_REQUIRED");

    expect(tx.$queryRaw).toHaveBeenCalledTimes(4);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.vipAdjustmentLog.findFirst.mock.invocationCallOrder[0]
    );
    expect(providerRefund).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled();
  });

  it("keeps the stable VIP reconciliation error during ZPAY finalization", async () => {
    const { db, tx } = createVipRefundDatabase("provider_succeeded");

    await expect(
      retryZpayRefundFinalization(
        { refundId: "refund-1", adminId: "admin-1" },
        { db }
      )
    ).rejects.toThrow("VIP_REFUND_RECONCILIATION_REQUIRED");

    expect(tx.membership.update).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("does not move a concurrently finalized payment back to finalize_retry", async () => {
    const { db, tx } = createVipRefundDatabase("provider_succeeded");
    tx.order.findFirst.mockResolvedValue(null);
    tx.membership.findFirst.mockRejectedValueOnce(new Error("LOCAL_FINALIZATION_FAILED"));
    tx.paymentTransaction.updateMany.mockResolvedValueOnce({ count: 0 });
    tx.paymentTransaction.findUniqueOrThrow.mockResolvedValueOnce({
      refundState: "finalized"
    });

    await expect(
      retryZpayRefundFinalization(
        { refundId: "refund-1", adminId: "admin-1" },
        { db }
      )
    ).resolves.toEqual({ outcome: "finalized", changed: false });

    expect(tx.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        refundState: { in: ["provider_succeeded", "finalize_retry"] }
      },
      data: {
        refundState: "finalize_retry",
        refundLastErrorCode: "local-finalization-failed",
        refundLastErrorDetail: null
      }
    });
    expect(tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(tx.adminAuditLog.create).not.toHaveBeenCalled();
  });
});
