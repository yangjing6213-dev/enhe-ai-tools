import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  tx: {
    $queryRaw: vi.fn(),
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    },
    tool: { update: vi.fn() },
    seoAuditCredit: {
      updateMany: vi.fn()
    },
    seoAuditSubscriptionOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    seoAuditSubscription: {
      update: vi.fn()
    },
    seoAuditRun: {
      count: vi.fn(),
      updateMany: vi.fn()
    },
    seoAuditSchedule: {
      updateMany: vi.fn()
    },
    vipAdjustmentLog: {
      findFirst: vi.fn(),
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

vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: db.trackEvent }));

describe("membership service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.trackEvent.mockReset().mockResolvedValue(undefined);
    db.prisma.$transaction.mockImplementation((callback: (tx: typeof db.tx) => unknown) => callback(db.tx));
    db.tx.order.update.mockImplementation(({ data }) => ({ id: "order-1", ...data }));
    db.tx.membership.findFirst.mockResolvedValue(null);
    db.tx.order.findFirst.mockResolvedValue(null);
    db.tx.membership.create.mockImplementation(({ data }) => ({ id: "membership-1", ...data }));
    db.tx.membership.update.mockImplementation(({ data }) => ({ id: "membership-1", ...data }));
    db.tx.toolPurchase.findUnique.mockResolvedValue(null);
    db.tx.$queryRaw.mockResolvedValue([{ id: "subscription-1" }]);
    db.tx.seoAuditSubscriptionOrder.findUnique.mockResolvedValue(null);
    db.tx.seoAuditSubscriptionOrder.findMany.mockResolvedValue([]);
    db.tx.seoAuditSubscription.update.mockImplementation(({ data }) => ({ id: "subscription-1", ...data }));
    db.tx.seoAuditRun.count.mockResolvedValue(0);
    db.tx.vipAdjustmentLog.findFirst.mockResolvedValue(null);
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
      amount: 19,
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
    expect(db.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "purchase_completed",
      entityType: "order",
      entityId: "order-1",
      path: "/orders/order-1",
      metadata: expect.objectContaining({ orderType: "vip", paymentProvider: "manual" }),
    }));
    expect(db.trackEvent.mock.calls[0][0].metadata).not.toHaveProperty("amount");
    expect(db.tx.tool.update).not.toHaveBeenCalled();
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
    expect(db.trackEvent).not.toHaveBeenCalled();
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
    expect(db.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "purchase_completed",
      entityId: "order-2",
      metadata: expect.objectContaining({ orderType: "software_download", toolId: "tool-1" }),
    }));
    expect(db.tx.tool.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: "tool-1" }, data: { downloadCount: { increment: 1 } },
    });
  });

  it.each([
    { label: "previously paid", orderStatus: "paid", paidAt: new Date("2026-10-20T00:00:00Z") },
    { label: "historical paid without timestamp", orderStatus: "paid", paidAt: null },
    { label: "reopened after payment", orderStatus: "pending_review", paidAt: new Date("2026-10-20T00:00:00Z") },
    { label: "already activated", orderStatus: "activated", paidAt: null },
    { label: "refunded", orderStatus: "refunded", paidAt: null },
    { label: "cancelled", orderStatus: "cancelled", paidAt: null },
    { label: "test order", orderStatus: "pending_review", paidAt: null, isTestData: true },
    { label: "zero amount", orderStatus: "pending_review", paidAt: null, amount: 0 },
  ])("does not count $label software orders as a new paid download", async (overrides) => {
    const { activateVipForOrder } = await import("@/lib/membership");
    db.tx.order.findUnique.mockResolvedValue({
      id: "order-2", userId: "user-1", toolId: "tool-1", orderType: "software_download",
      amount: 19, plan: null, paymentProof: null, ...overrides,
    });
    await activateVipForOrder("order-2", "admin-1");
    expect(db.tx.tool.update).not.toHaveBeenCalled();
  });

  it.each(["refunded", "cancelled"] as const)(
    "does not restore VIP entitlement when the order becomes %s before activation locks it",
    async (orderStatus) => {
      const { activateVipForOrder } = await import("@/lib/membership");
      const staleOrder = {
        id: "order-vip-race",
        userId: "user-1",
        toolId: null,
        planId: "plan-1",
        orderType: "vip",
        orderStatus: "pending_review",
        paidAt: new Date("2026-07-25T00:00:00.000Z"),
        activatedAt: null,
        plan: { id: "plan-1", name: "VIP", durationDays: 30 },
        paymentProof: null
      };
      const lockedOrder = { ...staleOrder, orderStatus };
      let readCount = 0;
      db.tx.order.findUnique.mockImplementation(() =>
        Promise.resolve(readCount++ === 0 ? staleOrder : lockedOrder)
      );

      await expect(
        activateVipForOrder("order-vip-race", "admin-1", "reviewed")
      ).resolves.toEqual(lockedOrder);

      expect(db.tx.order.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: "order-vip-race" },
        select: { id: true, userId: true, orderType: true, toolId: true, toolFileId: true }
      });
      expect(db.tx.order.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: "order-vip-race" },
        include: { plan: true, paymentProof: true, tool: { select: { type: true } } }
      });
      expect(db.tx.$queryRaw).toHaveBeenCalledTimes(2);
      expect(String(db.tx.$queryRaw.mock.calls[0]?.[0]?.sql)).toContain("FROM users");
      expect(String(db.tx.$queryRaw.mock.calls[1]?.[0]?.sql)).toContain("FROM orders");
      expect(db.tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
        db.tx.order.findUnique.mock.invocationCallOrder[1]
      );
      expect(db.tx.membership.create).not.toHaveBeenCalled();
      expect(db.tx.membership.update).not.toHaveBeenCalled();
      expect(db.tx.paymentProof.updateMany).not.toHaveBeenCalled();
      expect(db.tx.order.update).not.toHaveBeenCalled();
      expect(db.trackEvent).not.toHaveBeenCalled();
    }
  );

  it("tracks manual completion after commit and keeps activation successful if tracking fails", async () => {
    const { activateVipForOrder } = await import("@/lib/membership");
    const calls: string[] = [];
    db.tx.order.findUnique.mockResolvedValue({
      id: "order-manual", userId: "user-1", toolId: "tool-1",
      orderType: "software_download", orderStatus: "pending_review",
      amount: 19, paidAt: null, activatedAt: null, plan: null,
    });
    db.prisma.$transaction.mockImplementation(async (callback: (tx: typeof db.tx) => unknown) => {
      const result = await callback(db.tx);
      calls.push("commit");
      return result;
    });
    db.trackEvent.mockImplementation(async () => {
      calls.push("track");
      throw new Error("analytics unavailable");
    });

    await expect(activateVipForOrder("order-manual", "admin-1")).resolves.toMatchObject({ orderStatus: "activated" });

    expect(calls).toEqual(["commit", "track"]);
    expect(db.trackEvent).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(db.trackEvent.mock.calls)).not.toContain("admin-1");
  });

  it("does not track completion if entitlement activation rolls back", async () => {
    const { activateVipForOrder } = await import("@/lib/membership");
    db.tx.order.findUnique.mockResolvedValue({
      id: "order-manual", userId: "user-1", toolId: "tool-1",
      orderType: "software_download", orderStatus: "pending_review",
      amount: 19, paidAt: null, activatedAt: null, plan: null,
    });
    db.prisma.$transaction.mockImplementationOnce(async (callback: (tx: typeof db.tx) => unknown) => {
      await callback(db.tx);
      throw new Error("commit failed");
    });

    await expect(activateVipForOrder("order-manual", "admin-1")).rejects.toThrow("commit failed");

    expect(db.trackEvent).not.toHaveBeenCalled();
  });

  it("activates a manual test order without counting an ordinary purchase completion", async () => {
    const { activateVipForOrder } = await import("@/lib/membership");
    db.tx.order.findUnique.mockResolvedValue({
      id: "test-order-1", userId: "user-1", toolId: "tool-1",
      orderType: "software_download", orderStatus: "pending_review", isTestData: true,
      amount: 19, paidAt: null, activatedAt: null, plan: null,
    });

    await expect(activateVipForOrder("test-order-1", "admin-1")).resolves.toMatchObject({ orderStatus: "activated" });

    expect(db.tx.toolPurchase.upsert).toHaveBeenCalledTimes(1);
    expect(db.trackEvent).not.toHaveBeenCalled();
  });

  it.each(["refunded", "cancelled"] as const)(
    "does not restore software entitlement when the order becomes %s before activation locks it",
    async (orderStatus) => {
      const { activateVipForOrder } = await import("@/lib/membership");
      const staleOrder = {
        id: "order-software-race",
        userId: "user-1",
        toolId: "tool-1",
        toolPriceSpecId: "spec-1",
        toolPriceSpecName: "Single machine",
        planId: null,
        orderType: "software_download",
        orderStatus: "pending_review",
        paidAt: new Date("2026-07-25T00:00:00.000Z"),
        activatedAt: null,
        amount: 19,
        plan: null,
        paymentProof: null
      };
      const lockedOrder = { ...staleOrder, orderStatus };
      let readCount = 0;
      db.tx.order.findUnique.mockImplementation(() =>
        Promise.resolve(readCount++ === 0 ? staleOrder : lockedOrder)
      );

      await expect(
        activateVipForOrder("order-software-race", "admin-1", "reviewed")
      ).resolves.toEqual(lockedOrder);

      expect(db.tx.order.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: "order-software-race" },
        select: { id: true, userId: true, orderType: true, toolId: true, toolFileId: true }
      });
      expect(db.tx.order.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: "order-software-race" },
        include: { plan: true, paymentProof: true, tool: { select: { type: true } } }
      });
      expect(db.tx.$queryRaw).toHaveBeenCalledTimes(2);
      expect(String(db.tx.$queryRaw.mock.calls[0]?.[0]?.sql)).toContain("FROM orders");
      expect(String(db.tx.$queryRaw.mock.calls[1]?.[0]?.sql)).toContain(
        "pg_advisory_xact_lock"
      );
      expect(db.tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
        db.tx.order.findUnique.mock.invocationCallOrder[1]
      );
      expect(db.tx.toolPurchase.upsert).not.toHaveBeenCalled();
      expect(db.tx.paymentProof.updateMany).not.toHaveBeenCalled();
      expect(db.tx.order.update).not.toHaveBeenCalled();
      expect(db.trackEvent).not.toHaveBeenCalled();
    }
  );

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

  it("blocks a manual VIP grant while a VIP refund is pending", async () => {
    const { manuallyAdjustVip } = await import("@/lib/membership");
    db.tx.order.findFirst.mockResolvedValue({ id: "order-refunding" });

    await expect(
      manuallyAdjustVip({
        userId: "user-1",
        adminId: "admin-1",
        actionType: "grant",
        vipType: "VIP",
        durationDays: 30,
        reason: "conflicting grant"
      })
    ).rejects.toThrow("VIP_REFUND_RECONCILIATION_REQUIRED");

    expect(db.tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.tx.order.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        orderType: "vip",
        OR: [
          { refundRecords: { some: { status: "pending" } } },
          {
            paymentTransaction: {
              is: {
                refundState: {
                  in: [
                    "requested",
                    "dispatching",
                    "provider_succeeded",
                    "finalize_retry",
                    "ambiguous"
                  ]
                }
              }
            }
          }
        ]
      },
      select: { id: true }
    });
    expect(db.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.tx.order.findFirst.mock.invocationCallOrder[0]
    );
    expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
    expect(db.tx.vipAdjustmentLog.create).not.toHaveBeenCalled();
  });

  it("serializes manual VIP cancellation on the user row", async () => {
    const { manuallyAdjustVip } = await import("@/lib/membership");
    db.tx.membership.findFirst.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      vipType: "VIP",
      startTime: new Date("2026-01-01T00:00:00.000Z"),
      endTime: new Date("2026-02-01T00:00:00.000Z"),
      isLifetime: false,
      status: "active"
    });

    await manuallyAdjustVip({
      userId: "user-1",
      adminId: "admin-1",
      actionType: "cancel",
      vipType: "VIP",
      durationDays: 0,
      reason: "cancel"
    });

    expect(db.tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.tx.membership.findFirst.mock.invocationCallOrder[0]
    );
    expect(db.tx.order.findFirst).not.toHaveBeenCalled();
  });

  it("blocks VIP order activation while a VIP refund is in progress", async () => {
    const { activateVipForOrder } = await import("@/lib/membership");
    db.tx.order.findUnique.mockResolvedValue({
      id: "order-new-vip",
      userId: "user-1",
      planId: "plan-1",
      orderType: "vip",
      orderStatus: "pending_review",
      paidAt: new Date("2026-07-25T00:00:00.000Z"),
      plan: { id: "plan-1", name: "VIP", durationDays: 30 },
      paymentProof: null
    });
    db.tx.order.findFirst.mockResolvedValue({ id: "order-refunding" });

    await expect(
      activateVipForOrder("order-new-vip", "admin-1", "reviewed")
    ).rejects.toThrow("VIP_REFUND_RECONCILIATION_REQUIRED");

    expect(db.tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(db.tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      db.tx.order.findFirst.mock.invocationCallOrder[0]
    );
    expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
    expect(db.tx.membership.create).not.toHaveBeenCalled();
    expect(db.tx.order.update).not.toHaveBeenCalled();
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
      toolId: null,
      activatedAt: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(db.tx.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "membership-1" },
        data: expect.objectContaining({ status: "cancelled", isLifetime: false })
      })
    );
  });

  it("requires reconciliation before revoking VIP backed by another paid order", async () => {
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.order.findFirst.mockResolvedValue({ id: "order-2" });

    await expect(
      revokeEntitlementsForRefundedOrder(db.tx, {
        id: "order-1",
        userId: "user-1",
        orderType: "vip",
        toolId: null,
        activatedAt: new Date("2026-01-01T00:00:00.000Z")
      })
    ).rejects.toThrow("VIP_REFUND_RECONCILIATION_REQUIRED");

    expect(db.tx.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: { not: "order-1" },
        userId: "user-1",
        orderType: "vip",
        orderStatus: { in: ["paid", "activated"] }
      },
      select: { id: true }
    });
    expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
    expect(db.tx.membership.update).not.toHaveBeenCalled();
  });

  it("requires reconciliation for a later manual VIP grant when activatedAt is missing", async () => {
    const paidAt = new Date("2026-01-01T00:00:00.000Z");
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.vipAdjustmentLog.findFirst.mockResolvedValue({ id: "adjustment-1", actionType: "grant" });

    await expect(
      revokeEntitlementsForRefundedOrder(db.tx, {
        id: "order-1",
        userId: "user-1",
        orderType: "vip",
        toolId: null,
        activatedAt: null,
        paidAt,
        createdAt: new Date("2025-12-31T00:00:00.000Z")
      })
    ).rejects.toThrow("VIP_REFUND_RECONCILIATION_REQUIRED");

    expect(db.tx.vipAdjustmentLog.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        actionType: "grant",
        createdAt: { gt: paidAt }
      },
      select: { id: true }
    });
    expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
    expect(db.tx.membership.update).not.toHaveBeenCalled();
  });

  it("preserves a newer software authorization when an older order is refunded", async () => {
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.toolPurchase.findUnique.mockResolvedValue({ id: "purchase-1", orderId: "order-b" });

    await revokeEntitlementsForRefundedOrder(db.tx, {
      id: "order-a",
      userId: "user-1",
      orderType: "software_download",
      toolId: "tool-1"
    });

    expect(db.tx.toolPurchase.findUnique).toHaveBeenCalledWith({
      where: { userId_toolId: { userId: "user-1", toolId: "tool-1" } },
      select: { id: true, orderId: true }
    });
    expect(db.tx.order.findFirst).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.update).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.delete).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.deleteMany).not.toHaveBeenCalled();
  });

  it("rebinds a refunded current software authorization to the latest surviving order", async () => {
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.toolPurchase.findUnique.mockResolvedValue({ id: "purchase-1", orderId: "order-b" });
    db.tx.order.findFirst.mockResolvedValue({
      id: "order-a",
      amount: 19,
      toolPriceSpecId: "spec-a",
      toolPriceSpecName: "Single machine",
      toolFileId: "file-a"
    });

    await revokeEntitlementsForRefundedOrder(db.tx, {
      id: "order-b",
      userId: "user-1",
      orderType: "software_download",
      toolId: "tool-1"
    });

    expect(db.tx.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: { not: "order-b" },
        userId: "user-1",
        toolId: "tool-1",
        orderType: "software_download",
        orderStatus: "activated",
        paidAt: { not: null },
        refundRecords: { none: { status: "pending" } }
      },
      orderBy: [{ activatedAt: "desc" }, { paidAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        amount: true,
        toolPriceSpecId: true,
        toolPriceSpecName: true,
        toolFileId: true
      }
    });
    expect(db.tx.toolPurchase.update).toHaveBeenCalledWith({
      where: { id: "purchase-1" },
      data: {
        orderId: "order-a",
        amount: 19,
        toolPriceSpecId: "spec-a",
        toolPriceSpecName: "Single machine",
        fileId: "file-a"
      }
    });
    expect(db.tx.toolPurchase.delete).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes a refunded current software authorization when no funded order survives", async () => {
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.toolPurchase.findUnique.mockResolvedValue({ id: "purchase-1", orderId: "order-b" });

    await revokeEntitlementsForRefundedOrder(db.tx, {
      id: "order-b",
      userId: "user-1",
      orderType: "software_download",
      toolId: "tool-1"
    });

    expect(db.tx.toolPurchase.delete).toHaveBeenCalledWith({ where: { id: "purchase-1" } });
    expect(db.tx.toolPurchase.update).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.deleteMany).not.toHaveBeenCalled();
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
    expect(db.tx.seoAuditRun.updateMany).toHaveBeenNthCalledWith(1, {
      where: { sourceOrderId: "order-credit", status: "queued" },
      data: { status: "cancelled", cancelRequestedAt: refundedAt },
    });
    expect(db.tx.seoAuditRun.updateMany).toHaveBeenNthCalledWith(2, {
      where: { sourceOrderId: "order-credit", status: "running" },
      data: { status: "cancel_requested", cancelRequestedAt: refundedAt },
    });
    expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.deleteMany).not.toHaveBeenCalled();
  });

  it("refunds the linked funding order and disables a monitoring subscription with no remaining orders", async () => {
    const refundedAt = new Date("2026-07-25T01:02:03.000Z");
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.seoAuditSubscriptionOrder.findUnique
      .mockResolvedValueOnce({
        subscriptionId: "subscription-1",
        subscription: {
          project: { normalizedOrigin: "https://example.com" },
        },
      })
      .mockResolvedValueOnce({
        subscriptionId: "subscription-1",
        scheduledRunsGranted: 5,
        manualRunsGranted: 2,
        refundedAt: null,
        subscription: {
          status: "active",
          scheduledRunsUsed: 1,
          manualRunsRemaining: 1,
        },
      });

    await revokeEntitlementsForRefundedOrder(
      db.tx,
      {
        id: "order-monitoring",
        userId: "user-1",
        orderType: "seo_audit_monitoring",
        toolId: null
      },
      refundedAt,
    );

    expect(db.tx.seoAuditSubscriptionOrder.findUnique).toHaveBeenNthCalledWith(1, {
      where: { orderId: "order-monitoring" },
      select: {
        subscriptionId: true,
        subscription: {
          select: {
            project: { select: { normalizedOrigin: true } },
          },
        },
      },
    });
    expect(db.tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(db.tx.seoAuditSubscriptionOrder.findUnique).toHaveBeenNthCalledWith(2, {
      where: { orderId: "order-monitoring" },
      select: {
        subscriptionId: true,
        scheduledRunsGranted: true,
        manualRunsGranted: true,
        refundedAt: true,
        subscription: {
          select: {
            status: true,
            scheduledRunsUsed: true,
            manualRunsRemaining: true,
          },
        },
      }
    });
    expect(db.tx.seoAuditSubscriptionOrder.update).toHaveBeenCalledWith({
      where: { orderId: "order-monitoring" },
      data: { refundedAt }
    });
    expect(db.tx.seoAuditSubscription.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: {
        status: "refunded",
        maxScheduledRuns: 0,
        scheduledRunsUsed: 0,
        manualRunsRemaining: 0,
      }
    });
    expect(db.tx.seoAuditSchedule.updateMany).toHaveBeenCalledWith({
      where: { subscriptionId: "subscription-1" },
      data: { enabled: false, nextRunAt: null }
    });
    expect(db.tx.membership.findFirst).not.toHaveBeenCalled();
    expect(db.tx.toolPurchase.deleteMany).not.toHaveBeenCalled();
  });

  it("removes only the refunded monitoring order quotas when another renewal remains", async () => {
    const refundedAt = new Date("2026-07-25T01:02:03.000Z");
    const { revokeEntitlementsForRefundedOrder } = await import("@/lib/membership");
    db.tx.seoAuditSubscriptionOrder.findUnique
      .mockResolvedValueOnce({
        subscriptionId: "subscription-1",
        subscription: {
          project: { normalizedOrigin: "https://example.com" },
        },
      })
      .mockResolvedValueOnce({
        subscriptionId: "subscription-1",
        scheduledRunsGranted: 5,
        manualRunsGranted: 2,
        refundedAt: null,
        subscription: {
          status: "active",
          scheduledRunsUsed: 2,
          manualRunsRemaining: 3,
        },
      });
    db.tx.seoAuditSubscriptionOrder.findMany.mockResolvedValue([
      {
        serviceStartsAt: new Date("2026-08-01T00:00:00.000Z"),
        serviceEndsAt: new Date("2026-08-31T00:00:00.000Z"),
        scheduledRunsGranted: 5,
      },
    ]);
    db.tx.seoAuditRun.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    await revokeEntitlementsForRefundedOrder(
      db.tx,
      {
        id: "order-monitoring-old",
        userId: "user-1",
        orderType: "seo_audit_monitoring",
        toolId: null,
      },
      refundedAt,
    );

    expect(db.tx.seoAuditSubscription.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: {
        status: "active",
        startsAt: new Date("2026-08-01T00:00:00.000Z"),
        expiresAt: new Date("2026-08-31T00:00:00.000Z"),
        maxScheduledRuns: 5,
        scheduledRunsUsed: 1,
        manualRunsRemaining: 1,
      },
    });
    expect(db.tx.seoAuditSchedule.updateMany).not.toHaveBeenCalled();
  });
});
