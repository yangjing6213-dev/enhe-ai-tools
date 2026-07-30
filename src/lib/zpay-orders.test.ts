import { afterEach, describe, expect, it, vi } from "vitest";
import type { trackAnalyticsEvent } from "@/lib/analytics";
import { buildZpaySignedParams } from "@/lib/zpay";
import type { ZpayConfig } from "@/lib/zpay-config";

const grantSeoAuditEntitlementsForPaidOrderInTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/seo-audit/entitlements", () => ({
  grantSeoAuditEntitlementsForPaidOrderInTransaction,
}));

import {
  activateOrderFromZpayNotify,
  buildZpayPaymentRequest,
  requestZpayPayment,
  requestZpayRefund,
  validateZpayNotifyForOrder
} from "@/lib/zpay-orders";

const config: ZpayConfig = {
  mode: "live",
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
type AnalyticsEventInput = Parameters<typeof trackAnalyticsEvent>[0];

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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
      return_url: "https://www.enhe-tech.com.cn/orders/order123",
      money: "9.90",
      clientip: "203.0.113.10",
      param: "order123",
      sign_type: "MD5"
    });
    expect(String(request.params.name)).toMatch(/^AI Video Studio/);
    expect(Buffer.byteLength(String(request.params.name), "utf8")).toBeLessThanOrEqual(96);
    expect(request.params.notify_url).not.toContain("?");
    expect(request.params.return_url).toBe("https://www.enhe-tech.com.cn/orders/order123");
    expect(request.params.notify_url).toBe("https://www.enhe-tech.com.cn/api/zpay/notify");
    expect(request.params.sign).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("requestZpayPayment", () => {
  it("refuses to build a provider request unless payment mode is live", () => {
    expect(() =>
      buildZpayPaymentRequest({
        config: { ...config, mode: "disabled" },
        order,
        itemName: "Disabled provider request",
        clientIp: "203.0.113.10",
      }),
    ).toThrow("ZPAY_PAYMENT_DISABLED");
  });

  it("aborts a payment creation request after the configured timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const request = buildZpayPaymentRequest({
      config,
      order,
      itemName: "Bounded ZPAY request",
      clientIp: "203.0.113.10"
    });

    const rejection = expect(
      requestZpayPayment(request, { timeoutMs: 25 }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(25);

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.signal?.aborted).toBe(true);
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

describe("activateOrderFromZpayNotify", () => {
  function successfulPayload(tradeNo: string) {
    return buildZpaySignedParams(
      {
        pid: config.pid,
        money: "9.90",
        out_trade_no: order.orderNo,
        trade_no: tradeNo,
        trade_status: "TRADE_SUCCESS",
        type: "wxpay"
      },
      config.key
    );
  }

  function seoAuditFixture(overrides: Record<string, unknown> = {}) {
    const amount = {
      toString: () => "9.9",
      equals: () => true
    };
    const current = {
      id: order.id,
      orderNo: order.orderNo,
      userId: "user-1",
      toolId: null,
      toolPriceSpecId: null,
      toolPriceSpecName: null,
      seoAuditOfferId: "offer-1",
      seoAuditTargetOrigin: "https://private.example/full/path?report=secret",
      orderType: "seo_audit_credit",
      orderStatus: "pending_payment",
      paymentMethod: "wechat",
      amount,
      paidAt: null,
      activatedAt: null,
      paymentTransaction: null,
      refundRecords: [],
      ...overrides
    };
    const calls: string[] = [];
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: order.id }]),
      order: {
        findUnique: vi.fn().mockResolvedValue(current),
        update: vi.fn()
      },
      paymentTransaction: { upsert: vi.fn() },
      orderRefundRecord: {
        create: vi.fn().mockResolvedValue({ id: "refund-1" }),
        update: vi.fn()
      },
      adminAuditLog: { create: vi.fn() }
    };
    const db = {
      order: { findUnique: vi.fn().mockResolvedValue(current) },
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => {
        const result = await callback(tx);
        calls.push("commit");
        return result;
      })
    };
    return { calls, current, db, tx };
  }

  it("takes the software entitlement lock after the order row lock and before upsert", async () => {
    const softwareOrder = {
      id: order.id,
      orderNo: order.orderNo,
      userId: "user-1",
      toolId: "tool-1",
      toolPriceSpecId: "spec-1",
      toolPriceSpecName: "Single machine",
      orderType: "software_download",
      orderStatus: "pending_payment",
      paymentMethod: "wechat",
      amount: order.amount,
      paidAt: null,
      activatedAt: null,
      paymentTransaction: null
    };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: order.id }]),
      order: {
        findUnique: vi.fn().mockResolvedValue(softwareOrder),
        update: vi.fn()
      },
      paymentTransaction: { upsert: vi.fn() },
      toolPurchase: { upsert: vi.fn() },
      adminAuditLog: { create: vi.fn() }
    };
    const db = {
      order: { findUnique: vi.fn().mockResolvedValue(softwareOrder) },
      $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
    };
    const payload = buildZpaySignedParams(
      {
        pid: config.pid,
        money: "9.90",
        out_trade_no: order.orderNo,
        trade_no: "202607260001",
        trade_status: "TRADE_SUCCESS",
        type: "wxpay"
      },
      config.key
    );

    await expect(
      activateOrderFromZpayNotify(payload, {
        db: db as never,
        config,
        now: () => new Date("2026-07-26T00:00:00.000Z")
      })
    ).resolves.toEqual({ ok: true, response: "success", status: 200 });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(String(tx.$queryRaw.mock.calls[0]?.[0]?.sql)).toContain("FROM orders");
    expect(String(tx.$queryRaw.mock.calls[1]?.[0]?.sql)).toContain("pg_advisory_xact_lock");
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$queryRaw.mock.invocationCallOrder[1]
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.toolPurchase.upsert.mock.invocationCallOrder[0]
    );
    expect(tx.toolPurchase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_toolId: { userId: "user-1", toolId: "tool-1" } },
        update: expect.objectContaining({ orderId: order.id })
      })
    );
  });

  it("tracks a first monitoring purchase only after commit without URL or report data", async () => {
    const fixture = seoAuditFixture({ orderType: "seo_audit_monitoring" });
    const trackEvent = vi.fn(async (_event: AnalyticsEventInput) => {
      fixture.calls.push("track");
    });

    await expect(
      activateOrderFromZpayNotify(successfulPayload("202607260002"), {
        db: fixture.db as never,
        config,
        trackEvent,
        now: () => new Date("2026-07-26T00:00:00.000Z")
      })
    ).resolves.toEqual({ ok: true, response: "success", status: 200 });

    expect(fixture.calls).toEqual(["commit", "track", "track"]);
    expect(trackEvent.mock.calls.map(([event]) => event.eventName)).toEqual([
      "seo_audit_purchased",
      "seo_audit_monitoring_purchased"
    ]);
    for (const [event] of trackEvent.mock.calls) {
      expect(event).toMatchObject({
        entityType: "order",
        entityId: order.id,
        userId: "user-1",
        metadata: {
          orderType: "seo_audit_monitoring",
          amount: "9.9"
        },
        context: { orderId: order.id, offerId: "offer-1" }
      });
      expect(JSON.stringify(event)).not.toContain("https://");
      expect(JSON.stringify(event)).not.toContain("report=secret");
    }
  });

  it("keeps a successful first SEO audit callback successful when tracking fails", async () => {
    const fixture = seoAuditFixture();
    const trackEvent = vi.fn(async (_event: AnalyticsEventInput) => {
      throw new Error("analytics unavailable");
    });

    await expect(
      activateOrderFromZpayNotify(successfulPayload("202607260003"), {
        db: fixture.db as never,
        config,
        trackEvent,
        now: () => new Date("2026-07-26T00:00:00.000Z")
      })
    ).resolves.toEqual({ ok: true, response: "success", status: 200 });

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "seo_audit_purchased" })
    );
  });

  it("does not track replayed or late-after-refund callbacks", async () => {
    const paidAt = new Date("2026-07-26T00:00:00.000Z");
    const paidTransaction = {
      status: "paid",
      amount: { toString: () => "9.9", equals: () => true },
      paidAt,
      providerTradeNo: "202607260004",
      paymentType: "wxpay",
      refundState: null,
      refundLastErrorCode: null
    };
    const replay = seoAuditFixture({
      orderStatus: "activated",
      paidAt,
      activatedAt: paidAt,
      paymentTransaction: paidTransaction
    });
    const latePayment = seoAuditFixture({
      orderStatus: "refunded",
      refundRecords: []
    });
    const trackEvent = vi.fn(async (_event: AnalyticsEventInput) => undefined);

    await expect(
      activateOrderFromZpayNotify(successfulPayload("202607260004"), {
        db: replay.db as never,
        config,
        trackEvent
      })
    ).resolves.toEqual({ ok: true, response: "success", status: 200 });
    await expect(
      activateOrderFromZpayNotify(successfulPayload("202607260005"), {
        db: latePayment.db as never,
        config,
        trackEvent
      })
    ).resolves.toEqual({ ok: true, response: "success", status: 200 });

    expect(trackEvent).not.toHaveBeenCalled();
  });
});

describe("requestZpayRefund", () => {
  it("classifies provider success and stores only the code/message whitelist", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 1,
          msg: "refund accepted",
          trade_no: "must-not-be-persisted",
          merchant_secret: "must-not-be-persisted"
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestZpayRefund({ orderNo: order.orderNo, amount: "9.90", config })
    ).resolves.toEqual({
      kind: "succeeded",
      providerCode: "1",
      message: "refund accepted",
      payload: { code: "1", msg: "refund accepted" }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      redirect: "error"
    });
  });

  it("classifies a valid non-success provider code as a terminal rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "0", msg: "refund rejected" }), {
          status: 200
        })
      )
    );

    await expect(
      requestZpayRefund({ orderNo: order.orderNo, amount: "9.90", config })
    ).resolves.toEqual({
      kind: "rejected",
      providerCode: "0",
      message: "refund rejected",
      payload: { code: "0", msg: "refund rejected" }
    });
  });

  it.each([
    ["http-error", new Response("upstream failed", { status: 502 })],
    ["redirect", new Response("", { status: 307, headers: { location: "https://example.invalid" } })],
    ["invalid-json", new Response("not-json", { status: 200 })]
  ] as const)("classifies %s responses as ambiguous without retrying", async (errorCode, response) => {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestZpayRefund({ orderNo: order.orderNo, amount: "9.90", config })
    ).resolves.toMatchObject({ kind: "ambiguous", errorCode });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("classifies timeout and network failures as ambiguous without retrying", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = requestZpayRefund({
      orderNo: order.orderNo,
      amount: "9.90",
      config,
      timeoutMs: 25
    });
    await vi.advanceTimersByTimeAsync(25);

    await expect(pending).resolves.toMatchObject({
      kind: "ambiguous",
      errorCode: "timeout"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an insecure refund endpoint before sending merchant credentials", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestZpayRefund({
        orderNo: order.orderNo,
        amount: "9.90",
        config: { ...config, apiBase: "http://zpayz.cn" }
      })
    ).resolves.toEqual({
      kind: "ambiguous",
      errorCode: "invalid-config",
      detail: null
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
