import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin refund review pages", () => {
  it("localizes the refund list page in Chinese mode", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/refunds/page.tsx"), "utf8");

    expect(source).toContain("getCurrentLocale");
    expect(source).toContain("售后/退款审核");
    expect(source).toContain("{total} 条售后/退款记录");
    expect(source).toContain("getStatusLabel(refundStatusLabels, refund.status, locale)");
  });

  it("localizes the refund detail page in Chinese mode", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/refunds/[id]/page.tsx"), "utf8");

    expect(source).toContain("getCurrentLocale");
    expect(source).toContain("售后/退款详情");
    expect(source).toContain("权益二次核查");
    expect(source).toContain("getStatusLabel(orderStatusLabels, refund.order.orderStatus, locale)");
    expect(source).toContain("formatDateTime(refund.createdAt, locale)");
  });
});
