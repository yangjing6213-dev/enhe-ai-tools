import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateOrderForAdmin, type AdminOrderMutationDb } from "@/lib/admin-order-mutations";

vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: vi.fn() }));

describe("admin paid product download counting", () => {
  const tx = {
    $queryRaw: vi.fn(),
    order: { findUnique: vi.fn(), update: vi.fn() },
    tool: { update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  };
  const db = { $transaction: async (callback: (transaction: typeof tx) => unknown) => callback(tx) } as unknown as AdminOrderMutationDb;
  const input = {
    db, orderId: "order-1", adminId: "admin-1", amount: 5, paymentMethod: "wechat" as const,
    orderStatus: "paid" as const, auditContext: { ip: null, userAgent: null },
  };
  beforeEach(() => {
    vi.clearAllMocks();
    tx.order.findUnique.mockResolvedValue({
      id: input.orderId, toolId: "tool-1", orderType: "software_download", amount: 5,
      orderStatus: "pending_review", paidAt: null, activatedAt: null, isTestData: false,
      paymentTransaction: null, refundRecords: [],
    });
    tx.order.update.mockImplementation(({ data }) => ({ id: input.orderId, ...data }));
  });

  it("counts a product when the administrator first confirms payment", async () => {
    await updateOrderForAdmin(input);
    expect(tx.tool.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: "tool-1" }, data: { downloadCount: { increment: 1 } },
    });
  });

  it("does not count pending or rejected orders", async () => {
    await updateOrderForAdmin({ ...input, orderStatus: "rejected" });
    expect(tx.tool.update).not.toHaveBeenCalled();
  });

  it("counts a cancelled order when an administrator records its first real payment", async () => {
    const originalOrder = await tx.order.findUnique();
    tx.order.findUnique.mockResolvedValue({ ...originalOrder, orderStatus: "cancelled" });
    await updateOrderForAdmin(input);
    expect(tx.tool.update).toHaveBeenCalledOnce();
  });

  it("does not recount a cancelled order that already has a payment timestamp", async () => {
    const originalOrder = await tx.order.findUnique();
    tx.order.findUnique.mockResolvedValue({ ...originalOrder, orderStatus: "cancelled", paidAt: new Date("2026-10-25T00:00:00Z") });
    await updateOrderForAdmin(input);
    expect(tx.tool.update).not.toHaveBeenCalled();
  });

  it("uses the amount confirmed by the administrator for the first payment", async () => {
    const originalOrder = await tx.order.findUnique();
    tx.order.findUnique.mockResolvedValue({ ...originalOrder, amount: 0 });
    await updateOrderForAdmin(input);
    expect(tx.tool.update).toHaveBeenCalledOnce();
  });
});
