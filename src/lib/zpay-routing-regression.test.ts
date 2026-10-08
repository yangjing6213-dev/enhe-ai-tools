import { afterEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { loadZpayConfig } from "@/lib/zpay-config";
import { buildZpayPaymentRequest, ensureZpayPaymentForOrder, requestZpayPayment } from "@/lib/zpay-orders";
import { getZpayPaymentErrorCopy } from "@/lib/zpay-payment-copy";

const env = {
  ZPAY_MODE: "live", ZPAY_API_BASE: "https://pay.example.test", ZPAY_PID: "unit-merchant",
  ZPAY_KEY: "unit-key", ZPAY_DEFAULT_TYPE: "wxpay", ZPAY_CHANNEL_ID: "18680",
  NEXT_PUBLIC_SITE_URL: "https://site.example.test",
};
const order = {
  id: "unit-order", orderNo: "UNIT-ALIPAY", amount: new Prisma.Decimal("1.00"),
  paymentMethod: "alipay" as const,
};
afterEach(() => vi.unstubAllGlobals());

describe("independent Alipay and WeChat channels", () => {
  it.each([["alipay", "18670", "alipay"], ["wechat", "18680", "wxpay"]] as const)(
    "routes %s to its own channel", (paymentMethod, cid, type) => {
      const config = loadZpayConfig({ env: { ...env, ZPAY_ALIPAY_CHANNEL_ID: "18670", ZPAY_WECHAT_CHANNEL_ID: "18680" } });
      const request = buildZpayPaymentRequest({ config, order: { ...order, paymentMethod }, itemName: "Unit product", clientIp: "127.0.0.1" });
      expect(request.params).toMatchObject({ cid, type });
    },
  );

  it("does not leak the legacy WeChat channel into Alipay or send undefined", async () => {
    const request = buildZpayPaymentRequest({ config: loadZpayConfig({ env }), order, itemName: "Unit product", clientIp: "127.0.0.1" });
    expect(request.params.cid).toBeUndefined();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ code: 1, qrcode: "https://pay.example.test/unit" }));
    vi.stubGlobal("fetch", fetchMock);
    await requestZpayPayment(request);
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.has("cid")).toBe(false);
    expect(body.get("type")).toBe("alipay");
  });

  it("reports an explicit provider rejection without retrying or calling it ambiguous", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: order.id }]),
      order: { findFirst: vi.fn().mockResolvedValue({ ...order, orderType: "software_download", orderStatus: "pending_payment", createdAt: new Date(), tool: { name: "Unit product", type: "download" }, paymentTransaction: { status: "failed", rawResponse: { creationState: "failed" } } }) },
    };
    const db = { $transaction: vi.fn((callback) => callback(tx)) };
    const requestPayment = vi.fn();
    await expect(ensureZpayPaymentForOrder({ orderId: order.id }, { db: db as never, config: loadZpayConfig({ env }), requestPayment })).rejects.toThrow("ZPAY_PAYMENT_CREATION_REJECTED");
    expect(requestPayment).not.toHaveBeenCalled();
    expect(getZpayPaymentErrorCopy("ZPAY_PAYMENT_CREATION_REJECTED", order.orderNo).description).toContain("创建支付单失败");
  });

  it.each(["cancelled", "expired"])("never dispatches or reuses a QR for %s orders", async (state) => {
    const now = new Date("2026-10-08T14:00:00Z");
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: order.id }]),
      order: { findFirst: vi.fn().mockResolvedValue({ ...order, orderType: "software_download", orderStatus: state === "cancelled" ? "cancelled" : "pending_payment", createdAt: new Date(now.getTime() - 600_000), tool: { name: "Unit product", type: "download" }, paymentTransaction: null }) },
      paymentTransaction: { create: vi.fn().mockResolvedValue({ id: "unit-payment", amount: order.amount }) },
    };
    const db = { $transaction: vi.fn((callback) => callback(tx)) };
    const requestPayment = vi.fn();
    await expect(ensureZpayPaymentForOrder({ orderId: order.id }, { db: db as never, config: loadZpayConfig({ env }), now: () => now, requestPayment })).rejects.toThrow(state === "cancelled" ? "ZPAY_ORDER_CANCELLED" : "ZPAY_ORDER_EXPIRED");
    expect(requestPayment).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });
});
