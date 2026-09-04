import { describe, expect, test, vi } from "vitest";
import { validateEvidenceEnvelope, wrapRevenueEvidence } from "../../evidence";
import { buildRevenueEvidence } from "../revenue-evidence-builder";

function prismaWithOrders(orders: unknown[], refunds: unknown[] = [], tools: unknown[] = []) {
  return {
    order: { findMany: vi.fn(async () => orders) },
    orderRefundRecord: { findMany: vi.fn(async () => refunds) },
    tool: { findMany: vi.fn(async () => tools) }
  };
}

function decimal(value: number) {
  return { toString: () => String(value) };
}

describe("revenue evidence builder", () => {
  test("does not crash with empty revenue data", async () => {
    const evidence = await buildRevenueEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      prismaClient: prismaWithOrders([]),
      productEvidence: {
        productAudits: []
      }
    });

    expect(evidence.evidenceType).toBe("revenue_evidence");
    expect(evidence.revenueSummary.netRevenue).toBe(0);
    expect(evidence.orderSummary.totalOrders).toBe(0);
    expect(evidence.overallScore).toBeLessThanOrEqual(45);
  });

  test("uses Monday to Sunday local date keys for the default revenue period", async () => {
    const evidence = await buildRevenueEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      prismaClient: prismaWithOrders([])
    });

    expect(evidence.periodStart).toBe("2026-06-29");
    expect(evidence.periodEnd).toBe("2026-07-05");
  });

  test("generates first revenue warning and action item when net revenue is zero", async () => {
    const evidence = await buildRevenueEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      prismaClient: prismaWithOrders([]),
      productEvidence: {
        productAudits: [{ slug: "video-tool", score: 95 }],
        databaseSummary: {
          totalProducts: 1,
          publishedProducts: 1,
          draftProducts: 0,
          productsWithPrice: 1,
          productsWithDownload: 1,
          productsWithFaq: 1
        }
      }
    });

    expect(evidence.revenueSummary.firstRevenueAchieved).toBe(false);
    expect(evidence.warnings).toContainEqual(expect.objectContaining({
      message: "尚未完成第一批真实收入验证。"
    }));
    expect(evidence.actionItems).toContainEqual(expect.objectContaining({
      title: "选择 1-2 个高 readiness 产品进行首批收入验证"
    }));
    expect(evidence.overallScore).toBeLessThanOrEqual(55);
  });

  test("marks first revenue achieved when paid orders exist", async () => {
    const evidence = await buildRevenueEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      prismaClient: prismaWithOrders([
        {
          id: "order-1",
          toolId: "tool-1",
          amount: decimal(120),
          orderStatus: "paid",
          paidAt: new Date("2026-07-01T00:00:00.000Z"),
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          tool: { id: "tool-1", slug: "video-tool", name: "Video Tool" },
          refundRecords: []
        }
      ], [], [
        { id: "tool-1", slug: "video-tool", name: "Video Tool", isDownloadPaid: true, downloadFileId: "file-1", priceSpecs: [{ id: "price-1" }], faqs: [{ id: "faq-1" }] }
      ])
    });

    expect(evidence.revenueSummary.firstRevenueAchieved).toBe(true);
    expect(evidence.revenueReadinessFindings).toContain("已完成收入验证。");
    expect(evidence.overallScore).toBeGreaterThanOrEqual(60);
  });

  test("caps score at 55 when paid orders are fully refunded and net revenue is zero", async () => {
    const evidence = await buildRevenueEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      prismaClient: prismaWithOrders([
        {
          id: "order-1",
          toolId: "tool-1",
          amount: decimal(120),
          orderStatus: "paid",
          paidAt: new Date("2026-07-01T00:00:00.000Z"),
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          tool: { id: "tool-1", slug: "video-tool", name: "Video Tool" },
          refundRecords: [{ id: "refund-1", amount: decimal(120), status: "completed" }]
        }
      ], [
        { id: "refund-1", orderId: "order-1", amount: decimal(120), status: "completed" }
      ], [
        { id: "tool-1", slug: "video-tool", name: "Video Tool", isDownloadPaid: true, downloadFileId: "file-1", priceSpecs: [{ id: "price-1" }], faqs: [{ id: "faq-1" }] }
      ])
    });

    expect(evidence.revenueSummary.netRevenue).toBe(0);
    expect(evidence.revenueSummary.firstRevenueAchieved).toBe(false);
    expect(evidence.overallScore).toBeLessThanOrEqual(55);
  });

  test("caps database unavailable score at 30", async () => {
    const evidence = await buildRevenueEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      prismaClient: {
        order: {
          findMany: vi.fn(async () => {
            throw new Error("db down");
          })
        }
      }
    });

    expect(evidence.overallScore).toBeLessThanOrEqual(30);
    expect(evidence.confidence).toBe("partial");
  });

  test("wraps revenue evidence in a valid envelope", async () => {
    const evidence = await buildRevenueEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      prismaClient: prismaWithOrders([])
    });

    const envelope = wrapRevenueEvidence(evidence, {
      targetDate: evidence.targetDate,
      generatedAt: evidence.generatedAt,
      periodStart: evidence.periodStart,
      periodEnd: evidence.periodEnd,
      generator: "unit-test"
    });

    expect(envelope.meta.evidenceKind).toBe("revenue_evidence");
    expect(envelope.quality.score).toBe(evidence.overallScore);
    expect(validateEvidenceEnvelope(envelope)).toEqual({ valid: true, issues: [] });
  });
});
