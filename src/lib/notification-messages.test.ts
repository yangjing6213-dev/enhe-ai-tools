import { describe, expect, it } from "vitest";
import {
  buildManualVipNotification,
  buildPaymentReviewNotification,
  buildRefundProcessedNotification,
  buildRefundRequestNotification
} from "@/lib/notification-messages";

describe("notification messages", () => {
  it("builds payment review messages with order links", () => {
    expect(
      buildPaymentReviewNotification({
        orderId: "order-1",
        orderNo: "ENHE202605220001",
        decision: "approved"
      })
    ).toEqual({
      type: "payment_review",
      title: "付款审核已通过",
      content: "订单 ENHE202605220001 已审核通过，相关权益已完成开通。",
      linkUrl: "/orders/order-1"
    });

    expect(
      buildPaymentReviewNotification({
        orderId: "order-2",
        orderNo: "ENHE202605220002",
        decision: "rejected",
        reviewNote: "截图不清晰"
      }).content
    ).toContain("截图不清晰");
  });

  it("builds refund request and processed messages", () => {
    expect(buildRefundRequestNotification({ orderId: "order-1", orderNo: "NO1" })).toMatchObject({
      type: "refund_request",
      title: "售后/退款申请已提交",
      content: "订单 NO1 的售后/退款申请已提交，管理员处理后会在这里通知你。将在2个小时完成审核。",
      linkUrl: "/orders/order-1"
    });

    expect(
      buildRefundProcessedNotification({
        orderId: "order-2",
        orderNo: "NO2",
        status: "completed",
        note: "已线下退款"
      })
    ).toEqual({
      type: "refund_processed",
      title: "售后/退款处理完成",
      content: "订单 NO2 的售后/退款申请已处理完成。处理说明：已线下退款",
      linkUrl: "/orders/order-2"
    });
  });

  it("builds manual VIP adjustment messages", () => {
    expect(
      buildManualVipNotification({
        actionType: "grant",
        vipType: "1个月VIP",
        reason: "线下补偿"
      })
    ).toEqual({
      type: "vip_adjustment",
      title: "VIP 权益已调整",
      content: "管理员已为你开通/延长 1个月VIP。原因：线下补偿",
      linkUrl: "/user"
    });
  });
});
