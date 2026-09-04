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
        status: "paid",
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

    expect(summary.paidOrders).toBe(1);
    expect(summary.refundCount).toBe(1);
    expect(summary.refundedAmount).toBe(59);
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
        status: "paid",
        productSlug: "faceswap-studio-ai",
        productName: "FaceSwap Studio",
        refundCount: 0,
        refundedAmount: 0
      },
      {
        id: "order-2",
        amount: 39,
        status: "paid",
        productSlug: "ai-prompt-kit",
        productName: "ENHE AI Prompt Kit",
        refundCount: 0,
        refundedAmount: 0
      }
    ]);

    expect(metrics["validation-product-1-faceswap-studio-ai"]?.paidOrders).toBe(1);
    expect(metrics["validation-direction-3-ai-prompt-kit"]?.revenue).toBe(39);
  });
});
