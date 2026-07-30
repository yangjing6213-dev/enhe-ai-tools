import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/app/online-tools/seo-geo-audit/actions.ts"),
  "utf8",
);

describe("SEO audit purchase action source contract", () => {
  it("uses the existing security, pricing, order, analytics, and payment contracts", () => {
    for (const expected of [
      'assertValidCsrfToken(input.csrfToken)',
      'getCurrentUser()',
      'resolveSeoAuditPaidOffer(input.offerCode)',
      'createOrderNo()',
      'buildSeoAuditOrderCreateData',
      'eventName: "seo_audit_checkout_started"',
      'redirect(`/orders/${order.id}/pay`)',
    ]) {
      expect(source).toContain(expected);
    }
    expect(source).not.toMatch(/formData\.get\(["'](?:amount|pageLimit)["']\)/);
    expect(source).not.toContain("ensureZpayPaymentForOrder");
  });

  it("preserves the free run after login through a locale-aware returnTo URL", () => {
    expect(source).toContain('/login');
    expect(source).toContain('returnTo=');
    expect(source).toContain('buildLocalePath(productPath, input.locale)');
  });
});
