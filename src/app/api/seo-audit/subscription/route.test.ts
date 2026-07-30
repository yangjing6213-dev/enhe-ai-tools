import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({
  prisma: { seoAuditSubscription: { findFirst: mocks.findFirst } },
}));

import { GET } from "./route";

function request(id = "subscription-1") {
  return new Request(
    `https://www.enhe-tech.com.cn/api/seo-audit/subscription?subscriptionId=${id}`,
  );
}

describe("GET /api/seo-audit/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.findFirst.mockResolvedValue({
      id: "subscription-1",
      status: "active",
      schedule: {
        cadence: "weekly",
        notificationEmail: "alerts@example.com",
      },
    });
  });

  it("returns the owned plan notification address without caching", async () => {
    const response = await GET(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(payload.subscription.schedule.notificationEmail).toBe(
      "alerts@example.com",
    );
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "subscription-1", userId: "user-1" },
        select: expect.objectContaining({
          schedule: {
            select: expect.objectContaining({ notificationEmail: true }),
          },
        }),
      }),
    );
  });

  it("does not expose another user's subscription", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);
    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      code: "SUBSCRIPTION_NOT_FOUND",
    });
  });
});
