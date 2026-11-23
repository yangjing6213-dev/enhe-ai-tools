import { describe, expect, it } from "vitest";
import { getNotificationHistoryWhere } from "./notification-history";

describe("notification history query", () => {
  it("contains only read messages beyond the three newest messages", () => {
    expect(getNotificationHistoryWhere("user-1", ["newest-1", "newest-2", "newest-3"])).toEqual({
      userId: "user-1",
      readAt: { not: null },
      id: { notIn: ["newest-1", "newest-2", "newest-3"] }
    });
  });

  it("still excludes unread messages when there are no recent ids", () => {
    expect(getNotificationHistoryWhere("user-1", [])).toEqual({
      userId: "user-1",
      readAt: { not: null }
    });
  });
});
