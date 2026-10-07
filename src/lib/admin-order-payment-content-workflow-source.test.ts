import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const readRepo = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("admin order and payment review presentation", () => {
  it("mounts all four order/payment routes in the shared light content shell", () => {
    const routes = [
      read("app/admin/orders/page.tsx"),
      read("app/admin/orders/[id]/page.tsx"),
      read("app/admin/payments/page.tsx"),
      read("app/admin/payments/[id]/page.tsx")
    ];

    for (const route of routes) {
      expect(route).toContain("AdminContentShell");
      expect(route).toContain("enhe-admin-content-management");
    }
    expect(routes[0]).toContain("enhe-admin-order-list");
    expect(routes[1]).toContain("enhe-admin-order-detail");
    expect(routes[2]).toContain("enhe-admin-payment-list");
    expect(routes[3]).toContain("enhe-admin-payment-detail");
  });

  it("preserves payment review, order/refund actions, and delete protection", () => {
    const orderDetail = read("app/admin/orders/[id]/page.tsx");
    const paymentDetail = read("app/admin/payments/[id]/page.tsx");

    for (const action of [
      "updateOrderAdminAction",
      "createRefundRecordAdminAction",
      "processRefundRecordAdminAction",
      "deleteOrderAdminAction"
    ]) {
      expect(orderDetail).toContain(`action={${action}}`);
    }
    expect(orderDetail).toContain("decideAdminOrderHardDelete");
    expect(orderDetail).toContain("canRecordRefundForOrder");
    expect(paymentDetail).toContain("reviewPaymentProofAction");
    expect(paymentDetail).toContain('value="approved"');
    expect(paymentDetail).toContain('value="rejected"');
    expect(paymentDetail).toContain('name="reviewNote"');
  });

  it("keeps order filters and payment-proof relationships intact", () => {
    const orders = read("app/admin/orders/page.tsx");
    const payments = read("app/admin/payments/page.tsx");

    expect(orders).toContain("parseAdminOrderListParams");
    expect(orders).toContain("buildAdminOrderWhere");
    expect(orders).toContain('name="q"');
    expect(orders).toContain('name="status"');
    expect(orders).toContain("buildAdminOrderPageHref");
    expect(payments).toContain("prisma.paymentProof.findMany");
    expect(payments).toContain("/admin/payments/${proof.id}");
    expect(orders).toContain("enhe-admin-commerce-records");
    expect(payments).toContain("enhe-admin-commerce-records");
  });

  it("defines responsive detail, list, and risk-state surfaces", () => {
    const shell = readRepo("src/styles/redesign/shell.css");
    for (const selector of [
      ".enhe-admin-commerce-records",
      ".enhe-admin-order-summary-card",
      ".enhe-admin-payment-summary-card",
      ".enhe-admin-payment-review-form",
      ".enhe-admin-order-danger-panel"
    ]) {
      expect(shell).toContain(selector);
    }
  });
});
