import { describe, expect, it, vi } from "vitest";
import { deleteExpiredNotifications, getNotificationRetentionCutoffs } from "./notification-retention";

describe("notification retention", () => {
  it("uses calendar-month cutoffs for regular members and admins", () => {
    const cutoffs = getNotificationRetentionCutoffs(new Date("2026-05-31T18:20:00.000Z"));
    expect(cutoffs.memberBefore.toISOString()).toBe("2026-02-28T18:20:00.000Z");
    expect(cutoffs.adminBefore.toISOString()).toBe("2025-05-31T18:20:00.000Z");
  });

  it("deletes only notifications outside each recipient role's retention window", async () => {
    const deleteMany = vi.fn()
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ count: 2 });
    const result = await deleteExpiredNotifications({ notification: { deleteMany } } as unknown as Parameters<typeof deleteExpiredNotifications>[0], new Date("2026-05-31T18:20:00.000Z"));

    expect(deleteMany).toHaveBeenNthCalledWith(1, {
      where: { createdAt: { lt: new Date("2026-02-28T18:20:00.000Z") }, user: { is: { role: { not: "admin" } } } }
    });
    expect(deleteMany).toHaveBeenNthCalledWith(2, {
      where: { createdAt: { lt: new Date("2025-05-31T18:20:00.000Z") }, user: { is: { role: "admin" } } }
    });
    expect(result).toEqual({ membersDeleted: 4, adminsDeleted: 2 });
  });
});
