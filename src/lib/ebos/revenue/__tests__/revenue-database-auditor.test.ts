import { describe, expect, test, vi } from "vitest";
import { auditRevenueDatabase } from "../revenue-database-auditor";

function decimal(value: number) {
  return { toString: () => String(value) };
}

describe("revenue database auditor", () => {
  test("does not crash when the database is unavailable", async () => {
    const prismaClient = {
      order: {
        findMany: vi.fn(async () => {
          throw new Error("database unavailable");
        })
      }
    };

    const result = await auditRevenueDatabase({
      prismaClient,
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05"
    });

    expect(result.revenueSummary.netRevenue).toBe(0);
    expect(result.orderSummary.totalOrders).toBe(0);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "database_unavailable",
      severity: "warning"
    }));
  });

  test("generates zero revenue summaries when there are no orders", async () => {
    const prismaClient = {
      order: { findMany: vi.fn(async () => []) },
      orderRefundRecord: { findMany: vi.fn(async () => []) },
      tool: { findMany: vi.fn(async () => []) }
    };

    const result = await auditRevenueDatabase({
      prismaClient,
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05"
    });

    expect(result.currency).toBe("CNY");
    expect(result.revenueSummary).toMatchObject({
      grossRevenue: 0,
      netRevenue: 0,
      paidRevenue: 0,
      pendingRevenue: 0,
      unpaidRevenue: 0,
      averageOrderValue: 0,
      firstRevenueAchieved: false
    });
    expect(result.orderSummary.totalOrders).toBe(0);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      message: expect.stringContaining("Currency inferred as CNY")
    }));
  });

  test("summarizes paid orders, gross revenue, and net revenue", async () => {
    const prismaClient = {
      order: {
        findMany: vi.fn(async () => [
          {
            id: "order-1",
            toolId: "tool-1",
            amount: decimal(100),
            orderStatus: "activated",
            paidAt: new Date("2026-07-01T02:00:00.000Z"),
            activatedAt: new Date("2026-07-01T02:01:00.000Z"),
            createdAt: new Date("2026-07-01T01:00:00.000Z"),
            tool: { id: "tool-1", slug: "video-tool", name: "Video Tool" },
            paymentTransaction: { status: "paid" },
            refundRecords: []
          },
          {
            id: "order-2",
            toolId: "tool-1",
            amount: decimal(50),
            orderStatus: "activated",
            paidAt: new Date("2026-07-02T02:00:00.000Z"),
            activatedAt: new Date("2026-07-02T02:01:00.000Z"),
            createdAt: new Date("2026-07-02T01:00:00.000Z"),
            tool: { id: "tool-1", slug: "video-tool", name: "Video Tool" },
            paymentTransaction: { status: "paid" },
            refundRecords: []
          },
          {
            id: "order-3",
            amount: decimal(20),
            orderStatus: "pending_payment",
            createdAt: new Date("2026-07-03T01:00:00.000Z"),
            refundRecords: []
          }
        ])
      },
      orderRefundRecord: { findMany: vi.fn(async () => []) },
      tool: { findMany: vi.fn(async () => []) }
    };

    const result = await auditRevenueDatabase({
      prismaClient,
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05"
    });

    expect(result.orderSummary).toMatchObject({
      totalOrders: 3,
      paidOrders: 2,
      pendingOrders: 1,
      currentPeriodOrders: 3,
      currentPeriodPaidOrders: 2
    });
    expect(result.revenueSummary).toMatchObject({
      grossRevenue: 150,
      netRevenue: 150,
      paidRevenue: 150,
      pendingRevenue: 20,
      firstRevenueAchieved: true,
      averageOrderValue: 75
    });
    expect(result.revenueSummary.firstPaidOrderDate).toBe("2026-07-01T02:00:00.000Z");
    expect(result.revenueSummary.lastPaidOrderDate).toBe("2026-07-02T02:00:00.000Z");
  });

  test("counts completed refunds but removes refunded orders from revenue", async () => {
    const prismaClient = {
      order: {
        findMany: vi.fn(async () => [
          {
            id: "order-1",
            toolId: "tool-1",
            amount: decimal(100),
            orderStatus: "paid",
            paidAt: new Date("2026-07-01T02:00:00.000Z"),
            activatedAt: new Date("2026-07-01T02:01:00.000Z"),
            createdAt: new Date("2026-07-01T01:00:00.000Z"),
            paymentTransaction: { status: "paid" },
            refundRecords: [
              { id: "refund-1", amount: decimal(20), status: "completed", createdAt: new Date("2026-07-03T00:00:00.000Z") },
              { id: "refund-2", amount: decimal(30), status: "pending", createdAt: new Date("2026-07-04T00:00:00.000Z") },
              { id: "refund-3", amount: decimal(40), status: "rejected", createdAt: new Date("2026-07-05T00:00:00.000Z") }
            ]
          }
        ])
      },
      orderRefundRecord: {
        findMany: vi.fn(async () => [
          { id: "refund-1", orderId: "order-1", amount: decimal(20), status: "completed", createdAt: new Date("2026-07-03T00:00:00.000Z") },
          { id: "refund-2", orderId: "order-1", amount: decimal(30), status: "pending", createdAt: new Date("2026-07-04T00:00:00.000Z") },
          { id: "refund-3", orderId: "order-1", amount: decimal(40), status: "rejected", createdAt: new Date("2026-07-05T00:00:00.000Z") }
        ])
      },
      tool: { findMany: vi.fn(async () => []) }
    };

    const result = await auditRevenueDatabase({
      prismaClient,
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05"
    });

    expect(result.refundSummary).toMatchObject({
      totalRefunds: 1,
      currentPeriodRefunds: 1,
      refundedAmount: 20,
      refundRate: 1
    });
    expect(result.orderSummary.paidOrders).toBe(0);
    expect(result.revenueSummary.netRevenue).toBe(0);
  });

  test("generates warnings when expected fields are missing", async () => {
    const prismaClient = {
      order: { findMany: vi.fn(async () => [{ id: "order-1" }]) },
      orderRefundRecord: { findMany: vi.fn(async () => []) },
      tool: { findMany: vi.fn(async () => []) }
    };

    const result = await auditRevenueDatabase({
      prismaClient,
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05"
    });

    expect(result.databaseSummary.unsupportedFields).toEqual(expect.arrayContaining(["order.amount", "order.orderStatus"]));
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "database_field_unavailable"
    }));
  });

  test("counts only non-test paid delivered unrefunded orders as purchases and revenue", async () => {
    const baseOrder = {
      amount: decimal(10),
      orderStatus: "activated",
      paidAt: new Date("2026-07-01T01:00:00.000Z"),
      activatedAt: new Date("2026-07-01T01:01:00.000Z"),
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      isTestData: false,
      paymentTransaction: { status: "paid", paidAt: new Date("2026-07-01T01:00:00.000Z") },
      refundRecords: []
    };
    const prismaClient = {
      order: {
        findMany: vi.fn(async () => [
          { ...baseOrder, id: "qualified" },
          { ...baseOrder, id: "test", isTestData: true },
          { ...baseOrder, id: "undelivered", orderStatus: "paid", activatedAt: null },
          {
            ...baseOrder,
            id: "pending-refund",
            refundRecords: [{ id: "refund-pending", amount: decimal(10), status: "pending" }]
          },
          {
            ...baseOrder,
            id: "refunded",
            orderStatus: "refunded",
            paymentTransaction: { status: "refunded" },
            refundRecords: [{ id: "refund-complete", amount: decimal(10), status: "completed" }]
          },
          {
            ...baseOrder,
            id: "failed",
            orderStatus: "cancelled",
            activatedAt: null,
            paymentTransaction: { status: "failed" }
          }
        ])
      },
      orderRefundRecord: {
        findMany: vi.fn(async () => [
          { id: "refund-pending", orderId: "pending-refund", amount: decimal(10), status: "pending" },
          { id: "refund-complete", orderId: "refunded", amount: decimal(10), status: "completed" }
        ])
      },
      tool: { findMany: vi.fn(async () => []) }
    };

    const result = await auditRevenueDatabase({ prismaClient });

    expect(result.orderSummary).toMatchObject({
      paidOrders: 1,
      pendingRefundOrders: 1,
      undeliveredPaidOrders: 1,
      testOrdersExcluded: 1,
      refundedOrders: 1
    });
    expect(result.revenueSummary).toMatchObject({
      grossRevenue: 10,
      netRevenue: 10,
      paidRevenue: 10,
      averageOrderValue: 10,
      firstRevenueAchieved: true
    });
  });

  test("uses standalone refund records for order qualification and excludes test refunds", async () => {
    const baseOrder = {
      amount: decimal(10),
      orderStatus: "activated",
      paidAt: new Date("2026-07-01T01:00:00.000Z"),
      activatedAt: new Date("2026-07-01T01:01:00.000Z"),
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      paymentTransaction: { status: "paid", paidAt: new Date("2026-07-01T01:00:00.000Z") },
      refundRecords: []
    };
    const prismaClient = {
      order: {
        findMany: vi.fn(async () => [
          { ...baseOrder, id: "real-refunded", isTestData: false },
          { ...baseOrder, id: "test-refunded", isTestData: true }
        ])
      },
      orderRefundRecord: {
        findMany: vi.fn(async () => [
          { id: "refund-real", orderId: "real-refunded", amount: decimal(10), status: "completed" },
          { id: "refund-test", orderId: "test-refunded", amount: decimal(10), status: "completed" }
        ])
      },
      tool: { findMany: vi.fn(async () => []) }
    };

    const result = await auditRevenueDatabase({ prismaClient });

    expect(result.orderSummary.paidOrders).toBe(0);
    expect(result.orderSummary.refundedOrders).toBe(1);
    expect(result.revenueSummary).toMatchObject({
      grossRevenue: 0,
      netRevenue: 0,
      refundedAmount: 10,
      firstRevenueAchieved: false
    });
    expect(result.refundSummary).toMatchObject({
      totalRefunds: 1,
      refundedAmount: 10,
      refundRate: 1
    });
  });
});
