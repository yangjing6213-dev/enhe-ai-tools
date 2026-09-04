import { describe, expect, it } from "vitest";
import {
  countAdminMessagesByType,
  sortAdminMessages,
  type AdminMessage
} from "@/lib/admin-messages";

describe("admin message helpers", () => {
  it("sorts messages by severity and creation time", () => {
    const messages: AdminMessage[] = [
      { id: "low", type: "payment_review", title: "Payment pending", href: "/admin/payments", severity: "low", createdAt: new Date("2026-05-20") },
      { id: "high-old", type: "upload_error", title: "Upload issue", href: "/admin/files", severity: "high", createdAt: new Date("2026-05-18") },
      { id: "high-new", type: "refund_pending", title: "Refund request", href: "/admin/orders", severity: "high", createdAt: new Date("2026-05-21") }
    ];

    expect(sortAdminMessages(messages).map((message) => message.id)).toEqual(["high-new", "high-old", "low"]);
  });

  it("counts messages by type for dashboard badges", () => {
    const messages: AdminMessage[] = [
      { id: "p1", type: "payment_review", title: "Payment pending", href: "/admin/payments", severity: "high", createdAt: new Date() },
      { id: "p2", type: "payment_review", title: "Payment pending", href: "/admin/payments", severity: "high", createdAt: new Date() }
    ];

    expect(countAdminMessagesByType(messages)).toEqual({
      payment_review: 2,
      refund_pending: 0,
      upload_error: 0
    });
  });
});
