import { describe, expect, test } from "vitest";
import {
  attributeRevenueToProducts,
  calculateProductRevenueReadiness,
  rankProductsForRevenueValidation
} from "../revenue-attribution";
import type { EbosRevenueOrderRecord, EbosRevenueProductRecord } from "../revenue-evidence-types";

const products: EbosRevenueProductRecord[] = [
  {
    productId: "tool-1",
    productSlug: "video-tool",
    productName: "Video Tool",
    hasPriceConfigured: true,
    hasDownloadConfigured: true,
    hasFaqConfigured: true
  },
  {
    productId: "tool-2",
    productSlug: "voice-tool",
    productName: "Voice Tool",
    hasPriceConfigured: true,
    hasDownloadConfigured: false,
    hasFaqConfigured: true
  }
];

describe("revenue attribution", () => {
  test("attributes orders to products by toolId", () => {
    const orders: EbosRevenueOrderRecord[] = [
      {
        id: "order-1",
        toolId: "tool-1",
        amount: 100,
        status: "paid",
        isTestData: false,
        paymentSucceeded: true,
        delivered: true,
        paidAt: "2026-07-01T00:00:00.000Z"
      },
      {
        id: "order-2",
        toolId: "tool-1",
        amount: 50,
        status: "pending_payment"
      }
    ];

    const result = attributeRevenueToProducts({ orders, refunds: [], products });

    expect(result.productMetrics[0]).toMatchObject({
      productId: "tool-1",
      productSlug: "video-tool",
      ordersCount: 2,
      paidOrdersCount: 1,
      grossRevenue: 100,
      netRevenue: 100,
      averageOrderValue: 100
    });
  });

  test("completed refunds remove the order from purchases and attributed revenue", () => {
    const result = attributeRevenueToProducts({
      orders: [{
        id: "order-1",
        toolId: "tool-1",
        amount: 100,
        status: "paid",
        isTestData: false,
        paymentSucceeded: true,
        delivered: true
      }],
      refunds: [
        { id: "refund-1", orderId: "order-1", amount: 20, status: "completed" },
        { id: "refund-2", orderId: "order-1", amount: 30, status: "pending" },
        { id: "refund-3", orderId: "order-1", amount: 40, status: "rejected" }
      ],
      products
    });

    expect(result.productMetrics[0]).toMatchObject({
      paidOrdersCount: 0,
      grossRevenue: 0,
      netRevenue: 0,
      refundedAmount: 20
    });
  });

  test("pending refunds remove the order from purchases without counting refunded amount", () => {
    const result = attributeRevenueToProducts({
      orders: [{
        id: "order-1",
        toolId: "tool-1",
        amount: 100,
        status: "paid",
        isTestData: false,
        paymentSucceeded: true,
        delivered: true
      }],
      refunds: [
        { id: "refund-1", orderId: "order-1", amount: 30, status: "pending" },
        { id: "refund-2", orderId: "order-1", amount: 40, status: "rejected" }
      ],
      products
    });

    expect(result.productMetrics[0]).toMatchObject({
      paidOrdersCount: 0,
      netRevenue: 0,
      refundedAmount: 0
    });
  });

  test("keeps a historical completed refund aggregate when detailed records are unavailable", () => {
    const result = attributeRevenueToProducts({
      orders: [{
        id: "order-1",
        toolId: "tool-1",
        amount: 100,
        status: "paid",
        isTestData: false,
        paymentSucceeded: true,
        delivered: true,
        refundedAmount: 30
      }],
      refunds: [],
      products
    });

    expect(result.productMetrics[0]).toMatchObject({
      paidOrdersCount: 0,
      netRevenue: 0,
      refundedAmount: 30
    });
  });

  test("puts revenue into unattributed when no product key is available", () => {
    const result = attributeRevenueToProducts({
      orders: [{
        id: "order-1",
        amount: 80,
        status: "paid",
        isTestData: false,
        paymentSucceeded: true,
        delivered: true
      }],
      refunds: [],
      products
    });

    expect(result.unattributedRevenue.grossRevenue).toBe(80);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "revenue_unattributed"
    }));
  });

  test("recommends one or two products for revenue validation when there is no revenue", () => {
    const result = attributeRevenueToProducts({
      orders: [],
      refunds: [],
      products,
      productEvidence: {
        productAudits: [
          { slug: "video-tool", score: 96 },
          { slug: "voice-tool", score: 70 }
        ]
      }
    });

    const ranked = rankProductsForRevenueValidation(result.productMetrics);

    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({
      productSlug: "video-tool"
    });
  });

  test("calculates product revenue readiness score from commercial and product evidence", () => {
    expect(calculateProductRevenueReadiness({
      productSlug: "video-tool",
      ordersCount: 1,
      paidOrdersCount: 1,
      grossRevenue: 100,
      netRevenue: 100,
      refundedAmount: 0,
      averageOrderValue: 100,
      hasPriceConfigured: true,
      hasDownloadConfigured: true,
      hasFaqConfigured: true,
      productPageScore: 90,
      revenueReadinessScore: 0,
      findings: [],
      risks: [],
      opportunities: [],
      actionItems: []
    })).toBe(100);
  });
});
