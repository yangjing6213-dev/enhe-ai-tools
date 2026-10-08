import { afterEach, describe, expect, it, vi } from "vitest";
import { queryZpayOrder } from "@/lib/zpay-order-query";
import type { ZpayConfig } from "@/lib/zpay-config";

const config: ZpayConfig = { mode: "live", apiBase: "https://pay.example.test", pid: "unit-merchant", key: "unit-private-key", defaultType: "wxpay", siteUrl: "https://site.example.test" };
const order = { orderNo: "UNIT-QUERY", amount: "1.00", paymentMethod: "alipay" as const };
const response = { code: 1, status: 0, pid: config.pid, out_trade_no: order.orderNo, money: "1.00", type: "alipay", trade_no: "unit-trade", buyer: "private-buyer" };
afterEach(() => vi.unstubAllGlobals());

describe("read-only provider order verification", () => {
  it.each([[0, "unpaid"], [1, "paid"]] as const)("validates a status %s response", async (status, kind) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...response, status }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await queryZpayOrder(order, config)).toEqual({ kind });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "error", cache: "no-store" });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("act")).toBe("order");
  });
  it.each([{ money: "0.01" }, { pid: "other" }, { out_trade_no: "other" }, { type: "wxpay" }, { status: 2 }, { trade_no: "" }, { trade_no: {} }])("holds a mismatched response %j", async (patch) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...response, ...patch })));
    expect((await queryZpayOrder(order, config)).kind).toBe("unknown");
  });
  it("recognizes the observed wxpay2 query alias without changing outbound wxpay", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...response, type: "wxpay2" })));
    expect(await queryZpayOrder({ ...order, paymentMethod: "wechat" }, config)).toEqual({ kind: "unpaid" });
  });
  it.each([["订单编号不存在", "not_found"], ["KEY错误", "unknown"]])("distinguishes missing orders from failed queries", async (msg, kind) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: 0, msg })));
    expect((await queryZpayOrder(order, config)).kind).toBe(kind);
  });
  it("does not leak response, URL, buyer or credentials when a query fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(`https://pay.example.test/?key=${config.key}`)));
    const result = await queryZpayOrder(order, config);
    expect(result.kind).toBe("unknown");
    expect(JSON.stringify(result)).not.toContain(config.key);
  });
  it("does not query the provider when disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await queryZpayOrder(order, { ...config, mode: "disabled" })).kind).toBe("unknown");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
