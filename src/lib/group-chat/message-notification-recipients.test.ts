import { describe, expect, it } from "vitest";
import { routeGroupMessageNotifications } from "./message-notification-recipients";

describe("routeGroupMessageNotifications", () => {
  it("sends one notification category to each eligible member", () => {
    expect(routeGroupMessageNotifications({
      activeMemberIds: ["owner", "mentioned", "other", "sender"],
      senderId: "sender",
      replyToSenderId: "owner",
      mentionUserIds: ["mentioned", "owner"],
      mentionEveryone: false,
    })).toEqual({ reply: ["owner"], mentions: ["mentioned"], mentionAll: [], general: ["other"] });
  });

  it("includes every remaining member in an everyone mention without duplicates", () => {
    expect(routeGroupMessageNotifications({
      activeMemberIds: ["owner", "mentioned", "other", "sender"],
      senderId: "sender",
      replyToSenderId: "owner",
      mentionUserIds: ["mentioned", "owner"],
      mentionEveryone: true,
    })).toEqual({ reply: ["owner"], mentions: ["mentioned"], mentionAll: ["other"], general: [] });
  });
});
