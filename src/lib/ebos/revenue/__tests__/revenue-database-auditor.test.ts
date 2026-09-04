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
            orderStatus: "paid",
            paidAt: new Date("2026-07-01T02:00:00.000Z"),
            createdAt: new Date("2026-07-01T01:00:00.000Z"),
            tool: { id: "tool-1", slug: "video-tool", name: "Video Tool" },
            refundRecords: []
          },
          {
            id: "order-2",
            toolId: "tool-1",
            amount: decimal(50),
            orderStatus: "activated",
            paidAt: new Date("2026-07-02T02:00:00.000Z"),
            createdAt: new Date("2026-07-02T01:00:00.000Z"),
            tool: { id: "tool-1", slug: "video-tool", name: "Video Tool" },
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

  test("summarizes refunds, refunded amount, and refund rate", async () => {
    const prismaClient = {
      order: {
        findMany: vi.fn(async () => [
          {
            id: "order-1",
            toolId: "tool-1",
            amount: decimal(100),
            orderStatus: "paid",
            paidAt: new Date("2026-07-01T02:00:00.000Z"),
            createdAt: new Date("2026-07-01T01:00:00.000Z"),
            refundRecords: [{ id: "refund-1", amount: decimal(20), status: "completed", createdAt: new Date("2026-07-03T00:00:00.000Z") }]
          }
        ])
      },
      orderRefundRecord: {
        findMany: vi.fn(async () => [
          { id: "refund-1", orderId: "order-1", amount: decimal(20), status: "completed", createdAt: new Date("2026-07-03T00:00:00.000Z") }
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
      refundRate: 0.2
    });
    expect(result.revenueSummary.netRevenue).toBe(80);
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
});
