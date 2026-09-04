import { describe, expect, it } from "vitest";
import { buildZpaySignedParams } from "@/lib/zpay";
import type { ZpayConfig } from "@/lib/zpay-config";
import {
  buildZpayPaymentRequest,
  validateZpayNotifyForOrder
} from "@/lib/zpay-orders";

const config: ZpayConfig = {
  apiBase: "https://zpayz.cn",
  pid: "2026061115080760",
  key: "test_secret_32_chars_1234567890",
  defaultType: "wxpay",
  channelId: "18680",
  siteUrl: "https://www.enhe-tech.com.cn"
};

const order = {
  id: "order123",
  orderNo: "ENHE202606111930001234",
  amount: { toString: () => "9.9" },
  paymentMethod: "wechat" as const
};

describe("buildZpayPaymentRequest", () => {
  it("builds a signed dynamic QR request for a software download order", () => {
    const request = buildZpayPaymentRequest({
      config,
      order,
      itemName: "AI Video Studio 无所不能版本｜本地AI视频生成工作站｜文生视频 图生视频 视频增强 完整部署包 下载授权",
      clientIp: "203.0.113.10"
    });

    expect(request.endpoint).toBe("https://zpayz.cn/mapi.php");
    expect(request.params).toMatchObject({
      pid: "2026061115080760",
      cid: "18680",
      type: "wxpay",
      out_trade_no: "ENHE202606111930001234",
      notify_url: "https://www.enhe-tech.com.cn/api/zpay/notify",
      return_url: "https://www.enhe-tech.com.cn/login?payment=success",
      money: "9.90",
      clientip: "203.0.113.10",
      param: "order123",
      sign_type: "MD5"
    });
    expect(String(request.params.name)).toMatch(/^AI Video Studio/);
    expect(Buffer.byteLength(String(request.params.name), "utf8")).toBeLessThanOrEqual(96);
    expect(request.params.notify_url).not.toContain("?");
    expect(request.params.return_url).toContain("payment=success");
    expect(request.params.sign).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("validateZpayNotifyForOrder", () => {
  it("accepts a signed successful callback that matches merchant, order and amount", () => {
    const payload = buildZpaySignedParams(
      {
        pid: config.pid,
        name: "对话模拟器 下载授权",
        money: "9.90",
        out_trade_no: order.orderNo,
        trade_no: "202606112200001",
        param: order.id,
        trade_status: "TRADE_SUCCESS",
        type: "wxpay"
      },
      config.key
    );

    expect(validateZpayNotifyForOrder(payload, order, config)).toEqual({
      ok: true,
      reason: null
    });
  });

  it("rejects callbacks with a valid provider signature but the wrong amount", () => {
    const payload = buildZpaySignedParams(
      {
        pid: config.pid,
        name: "对话模拟器 下载授权",
        money: "0.01",
        out_trade_no: order.orderNo,
        trade_no: "202606112200001",
        param: order.id,
        trade_status: "TRADE_SUCCESS",
        type: "wxpay"
      },
      config.key
    );

    expect(validateZpayNotifyForOrder(payload, order, config)).toEqual({
      ok: false,
      reason: "amount-mismatch"
    });
  });

  it("rejects callbacks for a different merchant or order", () => {
    const wrongMerchantPayload = buildZpaySignedParams(
      {
        pid: "2026061115080999",
        money: "9.90",
        out_trade_no: order.orderNo,
        trade_no: "202606112200001",
        trade_status: "TRADE_SUCCESS",
        type: "wxpay"
      },
      config.key
    );

    expect(validateZpayNotifyForOrder(wrongMerchantPayload, order, config)).toEqual({
      ok: false,
      reason: "merchant-mismatch"
    });

    const wrongOrderPayload = buildZpaySignedParams(
      {
        pid: config.pid,
        money: "9.90",
        out_trade_no: "ENHE202606111930009999",
        trade_no: "202606112200001",
        trade_status: "TRADE_SUCCESS",
        type: "wxpay"
      },
      config.key
    );

    expect(validateZpayNotifyForOrder(wrongOrderPayload, order, config)).toEqual({
      ok: false,
      reason: "order-mismatch"
    });
  });
});
