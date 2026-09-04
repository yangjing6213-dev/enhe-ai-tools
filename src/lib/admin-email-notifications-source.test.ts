import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin email notification wiring", () => {
  it("documents SMTP configuration in the environment example", () => {
    const source = readFileSync(join(process.cwd(), ".env.example"), "utf8");

    expect(source).toContain("ADMIN_ALERT_EMAILS");
    expect(source).toContain("SMTP_HOST");
    expect(source).toContain("SMTP_PORT");
    expect(source).toContain("SMTP_USER");
    expect(source).toContain("SMTP_PASSWORD");
    expect(source).toContain("SMTP_FROM");
    expect(source).toContain("ADMIN_EMAIL_ACTION_WAIT_MS");
  });

  it("emails admin for user-facing review events", () => {
    const source = readFileSync(join(process.cwd(), "src/app/actions.ts"), "utf8");

    expect(source).toContain("sendNewOrderAdminEmail");
    expect(source).toContain("sendPaymentProofSubmittedAdminEmail");
    expect(source).toContain("sendPaymentReviewAdminEmail");
    expect(source).toContain("sendRefundRequestAdminEmail");
    expect(source).toContain("sendOrderReceiptAdminEmail");
    expect(source).toContain("submitOrderReceiptAction");
  });

  it("uses a bounded delivery window for user-facing order emails", () => {
    const source = readFileSync(join(process.cwd(), "src/app/actions.ts"), "utf8");

    expect(source).toContain("await sendUserFlowAdminEmail(() => sendNewOrderAdminEmail(order.id)");
    expect(source).toContain("await sendUserFlowAdminEmail(() => sendOrderReceiptAdminEmail(order.id");
    expect(source).toContain("ADMIN_EMAIL_ACTION_WAIT_MS");
    expect(source).toContain("Promise.race");
    expect(source).toContain("setTimeout");
    expect(source).not.toContain("void sendNewOrderAdminEmail(order.id)");
    expect(source).not.toContain("void sendOrderReceiptAdminEmail(order.id");
    expect(source).not.toContain("await sendNewOrderAdminEmail(order.id)");
    expect(source).not.toContain("await sendOrderReceiptAdminEmail(order.id");
  });

  it("sets finite SMTP timeouts for admin notification delivery", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/admin-email-notifications.ts"), "utf8");

    expect(source).toContain("SMTP_CONNECTION_TIMEOUT_MS");
    expect(source).toContain("SMTP_GREETING_TIMEOUT_MS");
    expect(source).toContain("SMTP_SOCKET_TIMEOUT_MS");
    expect(source).toContain("connectionTimeout:");
    expect(source).toContain("greetingTimeout:");
    expect(source).toContain("socketTimeout:");
  });

  it("emails admin for backend refund events without manual VIP wiring", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/actions.ts"), "utf8");

    expect(source).toContain("sendRefundProcessedAdminEmail");
    expect(source).not.toContain("sendManualVipAdjustmentAdminEmail");
  });
});
