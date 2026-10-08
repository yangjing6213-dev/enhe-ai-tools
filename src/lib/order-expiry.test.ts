import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { expireUnpaidOrder } from "@/lib/order-expiry";

const now = new Date("2026-10-08T13:20:00Z");
function fixture(overrides: Record<string, unknown> = {}) {
  const current = { id: "unit-expiry", orderNo: "UNIT-EXPIRY", orderStatus: "pending_payment", orderType: "software_download", paymentMethod: "alipay", amount: new Prisma.Decimal("1"), createdAt: new Date(now.getTime() - 600_000), updatedAt: new Date(now.getTime() - 600_000), paidAt: null, activatedAt: null, paymentTransaction: null, paymentProof: null, toolPurchase: null, seoAuditCredit: null, seoAuditSubscriptionOrder: null, ...overrides };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: current.id }]),
    order: { findUnique: vi.fn().mockResolvedValue(current), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    adminAuditLog: { create: vi.fn() },
  };
  const db = { order: { findUnique: vi.fn().mockResolvedValue(current) }, $transaction: vi.fn((callback) => callback(tx)) };
  const queryOrder = vi.fn().mockResolvedValue({ kind: "unpaid" });
  const config = { mode: "live" as const, apiBase: "https://pay.example.test", pid: "unit-merchant", key: "unit-key", defaultType: "wxpay" as const, siteUrl: "https://site.example.test" };
  return { current, tx, db, queryOrder, deps: { db: db as never, queryOrder, config, now: () => now } };
}
const pending = { id: "unit-payment", provider: "zpay", status: "pending", paymentType: "alipay", updatedAt: new Date(now.getTime() - 600_000), amount: new Prisma.Decimal("1"), rawResponse: { creationState: "created" }, providerTradeNo: "unit-trade", paidAt: null };

describe("ten-minute pending order cancellation", () => {
  it("cancels at the deadline and records an audit when no payment was dispatched", async () => {
    const f = fixture();
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("cancelled");
    expect(f.queryOrder).not.toHaveBeenCalled();
    expect(f.tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ orderStatus: "pending_payment" }), data: expect.objectContaining({ orderStatus: "cancelled" }) }));
    expect(f.tx.adminAuditLog.create).toHaveBeenCalledTimes(1);
  });
  it("does not cancel one millisecond before the deadline", async () => {
    const f = fixture({ createdAt: new Date(now.getTime() - 599_999) });
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("unchanged");
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it.each(["paid", "activated", "refunded", "cancelled", "pending_review"])("preserves %s orders", async (orderStatus) => {
    const f = fixture({ orderStatus });
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("unchanged");
    expect(f.queryOrder).not.toHaveBeenCalled();
  });
  it.each([{ paymentProof: { id: "proof" } }, { toolPurchase: { id: "purchase" } }, { paymentTransaction: { ...pending, status: "paid" } }, { orderType: "vip" }])("preserves payment evidence and manual orders %j", async (patch) => {
    const f = fixture(patch);
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("unchanged");
    expect(f.tx.adminAuditLog.create).not.toHaveBeenCalled();
  });
  it("queries a dispatched order and cancels only a matching unpaid result", async () => {
    const f = fixture({ paymentTransaction: pending });
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("cancelled");
    expect(f.queryOrder).toHaveBeenCalledTimes(1);
  });
  it.each(["paid", "unknown", "not_found"])("holds a previously created provider order when result is %s", async (kind) => {
    const f = fixture({ paymentTransaction: pending });
    f.queryOrder.mockResolvedValue({ kind });
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("held");
    expect(f.tx.adminAuditLog.create).not.toHaveBeenCalled();
    expect(f.tx.order.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orderStatus: "cancelled" }) }));
  });
  it("cancels an explicitly rejected order after the provider confirms it does not exist", async () => {
    const f = fixture({ paymentTransaction: { ...pending, providerTradeNo: null, status: "failed", rawResponse: { creationState: "failed" } } });
    f.queryOrder.mockResolvedValue({ kind: "not_found" });
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("cancelled");
  });
  it("does not cancel a dispatch still in progress", async () => {
    const f = fixture({ paymentTransaction: { ...pending, updatedAt: now, rawResponse: { creationState: "dispatching" } } });
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("held");
    expect(f.queryOrder).not.toHaveBeenCalled();
  });
  it("rechecks payment under the same order lock after querying the provider", async () => {
    const f = fixture({ paymentTransaction: pending });
    f.tx.order.findUnique.mockResolvedValue({ ...f.current, orderStatus: "activated", paidAt: now });
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("unchanged");
    expect(f.tx.adminAuditLog.create).not.toHaveBeenCalled();
  });
  it("rejects a changed payment attempt after its provider query", async () => {
    const f = fixture({ paymentTransaction: pending });
    f.tx.order.findUnique.mockResolvedValue({ ...f.current, paymentTransaction: { ...pending, updatedAt: now } });
    expect(await expireUnpaidOrder(f.current.id, f.deps)).toBe("held");
    expect(f.tx.adminAuditLog.create).not.toHaveBeenCalled();
  });
});
