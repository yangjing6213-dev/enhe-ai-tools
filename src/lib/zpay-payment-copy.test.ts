import { describe, expect, it } from "vitest";
import { getZpayPaymentErrorCopy } from "@/lib/zpay-payment-copy";

describe("ZPAY payment error copy", () => {
  it("clearly blocks retries while a payment attempt needs reconciliation", () => {
    const copy = getZpayPaymentErrorCopy(
      "ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED",
      "ENHE-ORDER-123",
    );

    expect(copy.title).toBe("支付订单需要核对");
    expect(copy.description).toContain("为避免重复扣款，暂时不能重新支付");
    expect(copy.nextStep).toContain("ENHE-ORDER-123");
    expect(JSON.stringify(copy)).not.toContain("ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED");
  });

  it("uses generic guidance for other payment provider failures", () => {
    const copy = getZpayPaymentErrorCopy("provider rejected request", "ENHE-ORDER-456");

    expect(copy.title).toBe("暂时无法生成支付二维码");
    expect(copy.description).toContain("支付平台暂未返回可用的支付二维码");
    expect(copy.nextStep).toContain("ENHE-ORDER-456");
    expect(JSON.stringify(copy)).not.toContain("provider rejected request");
  });
});
