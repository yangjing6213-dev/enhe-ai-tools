import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const refundList = source("src/app/admin/refunds/page.tsx");
const refundDetail = source("src/app/admin/refunds/[id]/page.tsx");
const paymentCodes = source("src/app/admin/payment-codes/page.tsx");
const licenseGenerator = source("src/app/admin/license-generator/page.tsx");
const licensePanel = source("src/app/admin/license-generator/license-generator-panel.tsx");

describe("refund, payment-code, and license admin presentation contract", () => {
  it("marks each route family for the shared light management shell", () => {
    expect(refundList).toContain("enhe-admin-refund-list");
    expect(refundDetail).toContain("enhe-admin-refund-detail");
    expect(paymentCodes).toContain("enhe-admin-payment-codes");
    expect(licenseGenerator + licensePanel).toContain("enhe-admin-license-generator");
  });

  it("preserves refund review modes, actions, and confirmation fields", () => {
    expect(refundDetail).toContain("getRefundAdminReviewMode");
    expect(refundDetail).toContain("processRefundRecordAdminAction");
    expect(refundDetail).toContain("resolveAmbiguousRefundAdminAction");
    expect(refundDetail).toContain("retryRefundFinalizationAdminAction");
    expect(refundDetail).toContain("recoverStaleRefundDispatchAdminAction");
    expect(refundDetail).toContain('name="refundConfirmation"');
    expect(refundDetail).toContain('name="providerRefundReference"');
  });

  it("preserves payment QR URL, upload, and save controls", () => {
    expect(paymentCodes).toContain("updatePaymentQrCodesAction");
    expect(paymentCodes).toContain('name="alipayQr"');
    expect(paymentCodes).toContain('fileName="alipayQrFile"');
    expect(paymentCodes).toContain('name="wechatQr"');
    expect(paymentCodes).toContain('fileName="wechatQrFile"');
  });

  it("preserves license generation inputs and the server action binding", () => {
    expect(licensePanel).toContain("generateLicenseCodeAdminAction");
    expect(licensePanel).toContain('name="licenseProduct"');
    expect(licensePanel).toContain('name="licenseType"');
    expect(licensePanel).toContain('name="machineId"');
    expect(licensePanel).toContain('name="licenseId"');
    expect(licensePanel).toContain('name="expiresAt"');
    expect(licensePanel).toContain("function copyCode()");
  });
});
