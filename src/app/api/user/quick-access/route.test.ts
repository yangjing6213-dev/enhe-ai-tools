import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  orderFindMany: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCount: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({
  prisma: {
    order: { findMany: mocks.orderFindMany },
    notification: {
      findMany: mocks.notificationFindMany,
      count: mocks.notificationCount,
    },
  },
}));

import { GET } from "./route";

function request(locale = "zh") {
  return new Request(`https://www.enhe-tech.com.cn/api/user/quick-access?locale=${locale}`);
}

describe("GET /api/user/quick-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.orderFindMany.mockResolvedValue([{
      id: "order-1",
      orderNo: "ENHE202610110001",
      amount: { toString: () => "1.00" },
      orderStatus: "pending_payment",
      orderType: "software_download",
      createdAt: new Date("2026-10-11T04:00:00.000Z"),
      plan: null,
      tool: { name: "AI 提示词管理系统" },
    }]);
    mocks.notificationFindMany.mockResolvedValue([{
      id: "notification-1",
      type: "general",
      title: "订单提醒",
      content: "订单正在等待付款。",
      linkUrl: null,
      readAt: null,
      createdAt: new Date("2026-10-11T04:00:00.000Z"),
    }]);
    mocks.notificationCount.mockResolvedValue(1);
  });

  it("returns only the current user's recent order and messages without caching", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(await response.json()).toEqual({
      hasUnread: true,
      orders: [{
        id: "order-1",
        orderNo: "ENHE202610110001",
        itemName: "AI 提示词管理系统",
        amount: "1.00",
        orderStatus: "pending_payment",
        createdAt: "2026-10-11T04:00:00.000Z",
      }],
      notifications: [{
        id: "notification-1",
        title: "订单提醒",
        content: "订单正在等待付款。",
        linkUrl: null,
        isRead: false,
        createdAt: "2026-10-11T04:00:00.000Z",
      }],
    });
    expect(mocks.orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }));
    expect(mocks.notificationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }));
    expect(mocks.notificationCount).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
    });
  });

  it("does not read personal data for visitors without an account session", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(await response.json()).toEqual({ hasUnread: false, orders: [], notifications: [] });
    expect(mocks.orderFindMany).not.toHaveBeenCalled();
    expect(mocks.notificationFindMany).not.toHaveBeenCalled();
    expect(mocks.notificationCount).not.toHaveBeenCalled();
  });
});
