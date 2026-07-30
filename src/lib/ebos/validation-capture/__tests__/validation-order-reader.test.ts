import { describe, expect, it } from "vitest";
import {
  mapOrdersToValidationPlans,
  readValidationOrders,
  summarizeValidationOrders
} from "../validation-order-reader";

describe("validation order reader", () => {
  it("does not crash when there are no orders", async () => {
    const summary = await readValidationOrders({
      prismaClient: {
        order: { findMany: async () => [] },
        orderRefundRecord: { findMany: async () => [] }
      }
    });

    expect(summary.ordersAvailable).toBe(true);
    expect(summary.totalOrders).toBe(0);
    expect(summary.paidOrders).toBe(0);
  });

  it("summarizes paid orders and revenue", () => {
    const summary = summarizeValidationOrders([
      {
        id: "order-1",
        amount: 29,
        status: "activated",
        paymentSucceeded: true,
        delivered: true,
        productSlug: "faceswap-studio-ai",
        productName: "FaceSwap Studio",
        refundCount: 0,
        refundedAmount: 0
      }
    ]);

    expect(summary.totalOrders).toBe(1);
    expect(summary.paidOrders).toBe(1);
    expect(summary.revenue).toBe(29);
    expect(summary.ordersByProductOrSlug["faceswap-studio-ai"]?.paidOrders).toBe(1);
  });

  it("summarizes refunds", () => {
    const summary = summarizeValidationOrders([
      {
        id: "order-1",
        amount: 59,
        status: "refunded",
        productSlug: "local-ai-video-studio-for-creator-workflows",
        productName: "AI Video Studio",
        refundCount: 1,
        refundedAmount: 59
      }
    ]);

    expect(summary.paidOrders).toBe(0);
    expect(summary.refundCount).toBe(1);
    expect(summary.refundedAmount).toBe(59);
  });

  it("only counts completed refund records from validation orders", async () => {
    const summary = await readValidationOrders({
      prismaClient: {
        order: {
          findMany: async () => [{
            id: "order-1",
            amount: 100,
            orderStatus: "paid",
            tool: {
              id: "tool-1",
              slug: "faceswap-studio-ai",
              name: "FaceSwap Studio"
            },
            refundCount: 3,
            refundedAmount: 90,
            refundRecords: [
              { id: "refund-1", amount: 20, status: "completed" },
              { id: "refund-2", amount: 30, status: "pending" },
              { id: "refund-3", amount: 40, status: "rejected" }
            ]
          }]
        }
      }
    });

    expect(summary.refundCount).toBe(1);
    expect(summary.refundedAmount).toBe(20);
    expect(summary.ordersByProductOrSlug["faceswap-studio-ai"]).toMatchObject({
      refundCount: 1,
      refundedAmount: 20
    });
  });

  it("warns when an order cannot be attributed", () => {
    const summary = summarizeValidationOrders([
      {
        id: "order-unknown",
        amount: 19,
        status: "paid",
        productName: "Unrelated Product",
        refundCount: 0,
        refundedAmount: 0
      }
    ]);

    expect(summary.warnings.some((warning) => warning.code === "order_attribution_unknown")).toBe(true);
  });

  it("maps attributed orders to validation plans", () => {
    const metrics = mapOrdersToValidationPlans([
      {
        id: "order-1",
        amount: 29,
        status: "activated",
        paymentSucceeded: true,
        delivered: true,
        productSlug: "faceswap-studio-ai",
        productName: "FaceSwap Studio",
        refundCount: 0,
        refundedAmount: 0
      },
      {
        id: "order-2",
        amount: 39,
        status: "activated",
        paymentSucceeded: true,
        delivered: true,
        productSlug: "ai-prompt-kit",
        productName: "ENHE AI Prompt Kit",
        refundCount: 0,
        refundedAmount: 0
      }
    ]);

    expect(metrics["validation-product-1-faceswap-studio-ai"]?.paidOrders).toBe(1);
    expect(metrics["validation-direction-3-ai-prompt-kit"]?.revenue).toBe(39);
  });

  it("excludes test, refunded, pending-refund, and undelivered orders from purchases", () => {
    const summary = summarizeValidationOrders([
      {
        id: "qualified",
        amount: 9.9,
        status: "activated",
        isTestData: false,
        paymentSucceeded: true,
        delivered: true,
        productSlug: "seo-audit-professional",
        refundCount: 0,
        pendingRefundCount: 0,
        refundedAmount: 0
      },
      {
        id: "test",
        amount: 9.9,
        status: "activated",
        isTestData: true,
        paymentSucceeded: true,
        delivered: true,
        productSlug: "seo-audit-professional",
        refundCount: 1,
        pendingRefundCount: 0,
        refundedAmount: 9.9
      },
      {
        id: "undelivered",
        amount: 9.9,
        status: "paid",
        isTestData: false,
        paymentSucceeded: true,
        delivered: false,
        productSlug: "seo-audit-professional",
        refundCount: 0,
        pendingRefundCount: 0,
        refundedAmount: 0
      },
      {
        id: "pending-refund",
        amount: 9.9,
        status: "activated",
        isTestData: false,
        paymentSucceeded: true,
        delivered: true,
        productSlug: "seo-audit-professional",
        refundCount: 0,
        pendingRefundCount: 1,
        refundedAmount: 0
      },
      {
        id: "refunded",
        amount: 9.9,
        status: "refunded",
        isTestData: false,
        paymentSucceeded: true,
        delivered: true,
        productSlug: "seo-audit-professional",
        refundCount: 1,
        pendingRefundCount: 0,
        refundedAmount: 9.9
      }
    ]);

    expect(summary).toMatchObject({
      paidOrders: 1,
      revenue: 9.9,
      refundCount: 1,
      pendingRefundOrders: 1,
      undeliveredPaidOrders: 1,
      testOrdersExcluded: 1
    });
  });
});
