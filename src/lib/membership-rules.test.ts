import { describe, expect, it } from "vitest";
import { applyVipCancellation, applyVipGrant } from "@/lib/membership-rules";

describe("membership business rules", () => {
  it("extends an active VIP membership from its existing end time", () => {
    const result = applyVipGrant(
      {
        id: "membership-1",
        vipType: "7天VIP",
        startTime: new Date("2026-05-01T00:00:00Z"),
        endTime: new Date("2026-05-30T00:00:00Z"),
        isLifetime: false,
        status: "active"
      },
      { name: "1个月VIP", durationDays: 30 },
      new Date("2026-05-20T00:00:00Z")
    );

    expect(result.endTime?.toISOString()).toBe("2026-06-29T00:00:00.000Z");
  });

  it("creates a lifetime VIP state for permanent grants", () => {
    const result = applyVipGrant(null, { name: "永久VIP", durationDays: 0 }, new Date("2026-05-20T00:00:00Z"));

    expect(result.isLifetime).toBe(true);
    expect(result.endTime).toBeNull();
    expect(result.status).toBe("active");
  });

  it("cancels VIP without keeping lifetime status", () => {
    const result = applyVipCancellation(
      {
        vipType: "永久VIP",
        startTime: new Date("2026-05-01T00:00:00Z"),
        endTime: null,
        isLifetime: true,
        status: "active"
      },
      new Date("2026-05-20T00:00:00Z")
    );

    expect(result?.isLifetime).toBe(false);
    expect(result?.status).toBe("cancelled");
    expect(result?.endTime?.toISOString()).toBe("2026-05-20T00:00:00.000Z");
  });
});
