import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findTicket: vi.fn(),
  findOrder: vi.fn(),
  consumeTicket: vi.fn(),
  createSession: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { $transaction: mocks.transaction } }));

import { GET } from "./route";

const ticket = "a".repeat(43);
const params = { params: Promise.resolve({ ticket }) };

describe("ZPAY payment return handoff", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findTicket.mockResolvedValue({
      id: "zpay_return:b3JkZXItMQ:nonce",
      userId: "user-1",
    });
    mocks.findOrder.mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      orderStatus: "activated",
      paymentTransaction: { status: "paid" },
      user: { status: "active", email: "buyer@example.test", nickname: "Buyer", role: "user" },
    });
    mocks.consumeTicket.mockResolvedValue({ count: 1 });
    mocks.createSession.mockResolvedValue({ id: "session-2" });
    mocks.transaction.mockImplementation((callback) => callback({
      $queryRaw: vi.fn().mockResolvedValue([{ id: "order-1" }]),
      session: {
        findFirst: mocks.findTicket,
        updateMany: mocks.consumeTicket,
        create: mocks.createSession,
      },
      order: { findUnique: mocks.findOrder },
    }));
  });

  it("starts an authenticated user-center session only after the order is paid", async () => {
    const response = await GET(new Request(`https://www.enhe-tech.com.cn/api/zpay/return/${ticket}`), params);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.enhe-tech.com.cn/user");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("set-cookie")).toContain("enhe_session=");
    expect(response.headers.get("set-cookie")).toContain("enhe_header_user=");
    expect(mocks.consumeTicket).toHaveBeenCalledOnce();
    expect(mocks.createSession).toHaveBeenCalledOnce();
    expect(mocks.createSession.mock.calls[0][0].data.userId).toBe("user-1");
  });

  it("does not consume a ticket or start a session while payment is still pending", async () => {
    mocks.findOrder.mockResolvedValue({
      id: "order-1",
      userId: "user-1",
      orderStatus: "pending_payment",
      paymentTransaction: { status: "pending" },
      user: { status: "active", email: "buyer@example.test", nickname: "Buyer", role: "user" },
    });

    const response = await GET(new Request(`https://www.enhe-tech.com.cn/api/zpay/return/${ticket}?trade_status=TRADE_SUCCESS`), params);

    expect(response.status).toBe(202);
    expect(await response.text()).toMatch(/正在确认付款|payment confirmation/i);
    expect(mocks.consumeTicket).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("rejects reused return tickets without issuing another session", async () => {
    mocks.consumeTicket.mockResolvedValue({ count: 0 });

    const response = await GET(new Request(`https://www.enhe-tech.com.cn/api/zpay/return/${ticket}`), params);

    expect(response.status).toBe(410);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("rejects a ticket if the order belongs to a different account", async () => {
    mocks.findOrder.mockResolvedValue({
      id: "order-1",
      userId: "someone-else",
      orderStatus: "activated",
      paymentTransaction: { status: "paid" },
      user: { status: "active", email: "other@example.test", nickname: "Other", role: "user" },
    });

    const response = await GET(new Request(`https://www.enhe-tech.com.cn/api/zpay/return/${ticket}`), params);

    expect(response.status).toBe(410);
    expect(mocks.consumeTicket).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});
