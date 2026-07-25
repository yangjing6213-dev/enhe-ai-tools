import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  tx: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    membership: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    paymentProof: {
      updateMany: vi.fn()
    },
    toolPurchase: {
      upsert: vi.fn(),
      deleteMany: vi.fn()
    },
    seoAuditCredit: {
      updateMany: vi.fn()
    },
    seoAuditSubscriptionOrder: {
      findUnique: vi.fn()
    },
    seoAuditSubscription: {
      update: vi.fn()
    },
    seoAuditSchedule: {
      updateMany: vi.fn()
    },
    vipAdjustmentLog: {
      create: vi.fn()
    }
  },
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("@/lib/db", () => ({
  prisma: db.prisma
}));

describe("membership service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.prisma.$transaction.mockImplementation((callback: (tx: typeof db.tx) => unknown) => callback(db.tx));
    db.tx.order.update.mockImplementation(({ data }) => ({ id: "order-1", ...data }));
    db.tx.membership.findFirst.mockResolvedValue(null);
    db.tx.membership.create.mockImplementation(({ data }) => ({ id: "membership-1", ...data }));
    db.tx.membership.update.mockImplementation(({ data }) => ({ id: "membership-1", ...data }));
    db.tx.seoAuditSubscriptionOrder.findUnique.mockResolvedValue(null);
    db.tx.seoAuditSubscription.update.mockImplementation(({ data }) => ({ id: "subscription-1", ...data }));
  });

  it("creates membership when a VIP order is approved", async () => {
    const { activateVipForOrder } = await import("@/lib/membership");
    db.tx.order.findUnique.mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      planId: "plan-1",
      orderType: "vip",
      orderStatus: "pending_review",
      paidAt: null,
      plan: { id: "plan-1", name: "7天VIP", durationDays: 7 },
      paymentProof: null
    });
    db.tx.membership.findFirst.mockResolvedValue(null);

    await activateVipForOrder("order-1", "admin-1", "ok");

    expect(db.tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          planId: "plan-1",
          vipType: "7天VIP",
          isLifetime: false,
          status: "active"
        })
      })
    );
    expect(db.tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderStatus: "activated" }) })
    );
  });

  it("repairs a VIP order that is already activated but has no active membership", async () => {
    const activatedAt = new Date("2026-06-06T05:10:30.000Z");
    const { activateVipForOrder } = await import("@/lib/membership");
    db.tx.order.findUnique.mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      planId: "plan-1",
      orderType: "vip",
      orderStatus: "activated",
      paidAt: activatedAt,
      activatedAt,
      plan: { id: "plan-1", name: "特惠VIP", durationDays: 30 },
      paymentProof: null
    });
    db.tx.membership.findFirst.mockResolvedValue(null);

    await activateVipForOrder("order-1", "admin-1", "repair");

    expect(db.tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          planId: "plan-1",
          vipType: "特惠VIP",
          startTime: activatedAt,
          status: "active"
        })
      })
    );
    expect(db.tx.order.update).not.toHaveBeenCalled();
  });

  it("creates software purchase authorization when a paid software order is approved", async () => {
    const { activateVipForOrder } = await import("@/lib/membership");
    db.tx.order.findUnique.mockResolvedValue({
      id: "order-2",
      userId: "user-1",
      toolId: "tool-1",
      toolPriceSpecId: "spec-1",
      toolPriceSpecName: "单机授权",
      orderType: "software_download",
      orderStatus: "pending_review",
      paidAt: null,
      amount: 19,
      plan: null,
      paymentProof: null
    });

    await activateVipForOrder("order-2", "admin-1", "ok");

    expect(db.tx.toolPurchase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_toolId: { userId: "user-1", toolId: "tool-1" } },
        update: expect.objectContaining({ toolPriceSpecId: "spec-1", toolPriceSpecName: "单机授权" }),
        create: expect.objectContaining({
          userId: "user-1",
          toolId: "tool-1",
          orderId: "order-2",
          toolPriceSpecId: "spec-1",
          toolPriceSpecName: "单机授权"
        })
      })
    );
  });

  it.each([
    { orderType: "seo_audit_credit", orderStatus: "pending_review" },
    { orderType: "seo_audit_credit", orderStatus: "activated" },
    { orderType: "seo_audit_monitoring", orderStatus: "pending_review" },
    { orderType: "seo_audit_monitoring", orderStatus: "activated" }
  ] as const)(
    "fails closed for $orderType orders in $orderStatus state until the dedicated dispatcher is available",
    async ({ orderType, orderStatus }) => {
      const { activateVipForOrder } = await import("@/lib/membership");
      db.tx.order.findUnique.mockResolvedValue({
        id: "order-seo",
        userId: "user-1",
        planId: "plan-1",
        orderType,
        orderStatus,
        paidAt: new Date("2026-07-25T00:00:00.000Z"),
        activatedAt: orderStatus === "activated" ? new Date("2026-07-25T00:00:00.000Z") : null,
        plan: { id: "plan-1", name: "VIP fallback must not run", durationDays: 30 },
        paymentProof: null
      });

      await expect(activateVipForOrder("order-seo", "admin-1", "reviewed")).rejects.toThrow(
        "SEO audit orders require the dedicated payment dispatcher."
      );

      expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
      expect(db.tx.membership.create).not.toHaveBeenCalled();
      expect(db.tx.membership.update).not.toHaveBeenCalled();
      expect(db.tx.toolPurchase.upsert).not.toHaveBeenCalled();
      expect(db.tx.paymentProof.updateMany).not.toHaveBeenCalled();
      expect(db.tx.order.update).not.toHaveBeenCalled();
    }
  );

  it("records an audit log when admin manually grants VIP", async () => {
    const { manuallyAdjustVip } = await import("@/lib/membership");
    db.tx.membership.findFirst.mockResolvedValue(null);

    await manuallyAdjustVip({
      userId: "user-1",
      adminId: "admin-1",
      actionType: "grant",
      vipType: "1个月VIP",
      durationDays: 30,
      reason: "线下补单"
    });

    expect(db.tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", vipType: "1个月VIP" }) })
    );
    expect(db.tx.vipAdjustmentLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          adminId: "admin-1",
          actionType: "grant",
          reason: "线下补单"
        })
      })
    );
  });

  it("revokes VIP membership when a VIP order is refunded", async () => {
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.membership.findFirst.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      vipType: "7澶￢IP",
      startTime: new Date("2026-01-01T00:00:00.000Z"),
      endTime: new Date("2026-01-08T00:00:00.000Z"),
      isLifetime: false,
      status: "active"
    });

    await revokeEntitlementsForRefundedOrder(db.tx, {
      id: "order-1",
      userId: "user-1",
      orderType: "vip",
      toolId: null
    });

    expect(db.tx.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "membership-1" },
        data: expect.objectContaining({ status: "cancelled", isLifetime: false })
      })
    );
  });

  it("revokes paid software authorization when a software order is refunded", async () => {
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");

    await revokeEntitlementsForRefundedOrder(db.tx, {
      id: "order-2",
      userId: "user-1",
      orderType: "software_download",
      toolId: "tool-1"
    });

    expect(db.tx.toolPurchase.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ orderId: "order-2" }, { userId: "user-1", toolId: "tool-1" }] }
    });
  });

  it("exhausts the order credit when an SEO audit credit order is refunded", async () => {
    const refundedAt = new Date("2026-07-25T01:02:03.000Z");
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");

    await revokeEntitlementsForRefundedOrder(
      db.tx,
      {
        id: "order-credit",
        userId: "user-1",
        orderType: "seo_audit_credit",
        toolId: null
      },
      refundedAt
    );

    expect(db.tx.seoAuditCredit.updateMany).toHaveBeenCalledWith({
      where: { orderId: "order-credit" },
      data: { remainingRuns: 0, refundedAt }
    });
    expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.deleteMany).not.toHaveBeenCalled();
  });

  it("refunds the linked subscription and disables its schedule for a monitoring order", async () => {
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.seoAuditSubscriptionOrder.findUnique.mockResolvedValue({ subscriptionId: "subscription-1" });

    await revokeEntitlementsForRefundedOrder(db.tx, {
      id: "order-monitoring",
      userId: "user-1",
      orderType: "seo_audit_monitoring",
      toolId: null
    });

    expect(db.tx.seoAuditSubscriptionOrder.findUnique).toHaveBeenCalledWith({
      where: { orderId: "order-monitoring" },
      select: { subscriptionId: true }
    });
    expect(db.tx.seoAuditSubscription.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: { status: "refunded" }
    });
    expect(db.tx.seoAuditSchedule.updateMany).toHaveBeenCalledWith({
      where: { subscriptionId: "subscription-1" },
      data: { enabled: false, nextRunAt: null }
    });
    expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.deleteMany).not.toHaveBeenCalled();
  });
});
