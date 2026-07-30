import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actionSource = readFileSync(join(process.cwd(), "src/app/actions.ts"), "utf8");
const orderRulesSource = readFileSync(join(process.cwd(), "src/lib/order-rules.ts"), "utf8");
const orderPageSource = readFileSync(
  join(process.cwd(), "src/app/orders/[id]/page.tsx"),
  "utf8",
);
const adminRefundPageSource = readFileSync(
  join(process.cwd(), "src/app/admin/refunds/[id]/page.tsx"),
  "utf8",
);

describe("SEO audit refund benefit checks", () => {
  it("blocks a user refund request after a funded audit run exists", () => {
    expect(actionSource).toContain("getRefundBenefitUsageScopes");
    expect(actionSource).toContain("ORDER_ENTITLEMENT_SCOPE_INVALID");
    expect(actionSource).toContain("tx.seoAuditRun.count");
    expect(orderRulesSource).toContain("sourceOrderId: input.orderId");
    expect(actionSource).toContain("seoAuditRunCount > 0");
  });

  it("serializes the refund request with entitlement consumption and permits only one request per order", () => {
    expect(actionSource).toContain("prisma.$transaction");
    expect(actionSource).toMatch(/FROM orders[\s\S]+FOR UPDATE/);
    expect(actionSource).toMatch(/refundRecords:\s*\{\s*select:\s*\{\s*id:\s*true\s*\},\s*take:\s*1\s*\}/);
    expect(actionSource).not.toContain('refundRecords: { where: { status: "pending" }');
  });

  it("uses the same funded-run signal on the order and admin refund pages", () => {
    expect(orderPageSource).toContain("getRefundBenefitUsageScopes");
    expect(adminRefundPageSource).toContain("getRefundBenefitUsageScopes");
    expect(adminRefundPageSource).toContain("seoAuditRunCount");
  });

  it("keeps page benefit checks isolated by order type and entitlement start", () => {
    expect(orderPageSource).toContain("benefitUsageScopes.downloadLog");
    expect(orderPageSource).toContain("benefitUsageScopes.toolUsageLog");
    expect(orderPageSource).toContain("benefitUsageScopes.seoAuditRun");
    expect(adminRefundPageSource).toContain("benefitUsageScopes.downloadLog");
    expect(adminRefundPageSource).toContain("benefitUsageScopes.toolUsageLog");
    expect(adminRefundPageSource).toContain("benefitUsageScopes.seoAuditRun");
    expect(adminRefundPageSource).toContain("benefitUsageScopes.isVerifiable");
  });

  it("never reopens the user refund form after any historical or provider refund attempt", () => {
    expect(orderPageSource).toContain("hasExistingRefundAttempt");
    expect(orderPageSource).toContain("paymentTransaction");
    expect(orderPageSource).not.toContain("hasPendingRefundRequest");
  });

  it("shows distinct user-facing reasons when online refund is unavailable", () => {
    expect(orderPageSource).toContain("refundUnavailableMessage");
    expect(orderPageSource).toContain("benefitUsageScopes.isVerifiable");
    expect(orderPageSource).toContain("hasUsedBenefits");
    expect(orderPageSource).toContain("订单权益关联异常");
    expect(orderPageSource).toContain("订单权益已经使用");
  });
});
