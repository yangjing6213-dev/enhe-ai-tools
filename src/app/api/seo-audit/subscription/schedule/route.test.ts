import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateSchedule: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/seo-audit/schedules", () => ({
  updateOwnedSeoAuditSchedule: mocks.updateSchedule,
}));

import { PATCH } from "./route";

function request(body: unknown, origin = "https://www.enhe-tech.com.cn") {
  return new Request(
    "https://www.enhe-tech.com.cn/api/seo-audit/subscription/schedule",
    {
      method: "PATCH",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(body),
    },
  );
}

const validBody = {
  subscriptionId: "subscription-1",
  cadence: "weekly",
  weekday: 2,
  hour: 9,
  enabled: true,
  notificationEmail: "alerts@example.com",
} as const;

describe("PATCH /api/seo-audit/subscription/schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.updateSchedule.mockResolvedValue({ scheduleId: "schedule-1" });
  });

  it("updates an owned plan with a validated notification address", async () => {
    const response = await PATCH(request(validBody));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      scheduleId: "schedule-1",
    });
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(mocks.updateSchedule).toHaveBeenCalledWith({
      userId: "user-1",
      subscriptionId: "subscription-1",
      schedule: {
        cadence: "weekly",
        weekday: 2,
        hour: 9,
        minute: 0,
        enabled: true,
        notificationEmail: "alerts@example.com",
      },
    });
  });

  it("allows notifications to be disabled without losing schedule controls", async () => {
    const response = await PATCH(
      request({ ...validBody, notificationEmail: "   ", enabled: false }),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: expect.objectContaining({
          enabled: false,
          notificationEmail: null,
        }),
      }),
    );
  });

  it("rejects malformed addresses, cross-site requests, and anonymous users", async () => {
    const malformed = await PATCH(
      request({ ...validBody, notificationEmail: "not-an-email" }),
    );
    expect(malformed.status).toBe(400);
    expect(mocks.updateSchedule).not.toHaveBeenCalled();

    const crossSite = await PATCH(
      request(validBody, "https://attacker.example"),
    );
    expect(crossSite.status).toBe(403);

    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const anonymous = await PATCH(request(validBody));
    expect(anonymous.status).toBe(401);
  });
});
