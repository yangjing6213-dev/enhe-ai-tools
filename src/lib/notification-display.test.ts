import { describe, expect, it } from "vitest";
import { getNotificationDisplay } from "@/lib/notification-display";

describe("getNotificationDisplay", () => {
  it("keeps stored notification copy in Chinese mode", () => {
    const display = getNotificationDisplay(
      {
        type: "payment_review",
        title: "付款审核已通过",
        content: "订单 ENHE202605230001 已审核通过，相关权益已完成开通。"
      },
      "zh"
    );

    expect(display.title).toBe("付款审核已通过");
    expect(display.content).toContain("相关权益已完成开通");
  });

  it("translates payment review notifications in English mode", () => {
    const display = getNotificationDisplay(
      {
        type: "payment_review",
        title: "付款审核已通过",
        content: "订单 ENHE202605230001 已审核通过，相关权益已完成开通。"
      },
      "en"
    );

    expect(display.title).toBe("Payment review approved");
    expect(display.content).toBe("Order ENHE202605230001 has been approved and the related benefits are now active.");
  });

  it("translates refund request notifications in English mode", () => {
    const display = getNotificationDisplay(
      {
        type: "refund_request",
        title: "售后/退款申请已提交",
        content: "订单 ENHE202605230002 的售后/退款申请已提交，管理员处理后会在这里通知你。"
      },
      "en"
    );

    expect(display.title).toBe("After-sales/refund request submitted");
    expect(display.content).toContain("Order ENHE202605230002");
    expect(display.content).toContain("within 2 hours");
  });

  it("translates VIP cancellation notifications in English mode", () => {
    const display = getNotificationDisplay(
      {
        type: "vip_adjustment",
        title: "VIP 权益已调整",
        content: "管理员已取消你的 VIP 权益。原因：售后退款"
      },
      "en"
    );

    expect(display.title).toBe("VIP benefits adjusted");
    expect(display.content).toBe("Your VIP benefits were cancelled by an admin. Reason: 售后退款");
  });
});
