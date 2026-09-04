import { describe, expect, it } from "vitest";
import { createAdminAuditData } from "@/lib/admin-audit";

describe("admin audit helpers", () => {
  it("builds a compact audit log payload with request context", () => {
    expect(
      createAdminAuditData(
        {
          adminId: "admin-1",
          action: "order.refund.create",
          targetType: "order",
          targetId: "order-1",
          summary: "Created refund record",
          metadata: { amount: 19 }
        },
        { ip: "127.0.0.1", userAgent: "vitest" }
      )
    ).toEqual({
      adminId: "admin-1",
      action: "order.refund.create",
      targetType: "order",
      targetId: "order-1",
      summary: "Created refund record",
      metadata: { amount: 19 },
      ip: "127.0.0.1",
      userAgent: "vitest"
    });
  });
});
