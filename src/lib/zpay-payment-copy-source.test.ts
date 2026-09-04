import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("zpay payment page copy", () => {
  it("keeps provider and internal status details out of the customer-facing payment panel", () => {
    const payPage = readFileSync(resolve(root, "src/app/orders/[id]/pay/page.tsx"), "utf8");
    const poller = readFileSync(resolve(root, "src/components/zpay-payment-status-poller.tsx"), "utf8");

    expect(payPage).toContain("支付成功后，自动解锁该软件的下载链接。");
    expect(payPage).not.toContain("ZPAY 会通知网站");
    expect(payPage).not.toContain("ZPAY 订单号");
    expect(poller).not.toContain("当前订单状态");
    expect(poller).not.toContain("支付状态");
    expect(poller).not.toContain("等待支付结果回调");
  });

  it("does not render stale payment QR codes for cancelled or refunded orders", () => {
    const payPage = readFileSync(resolve(root, "src/app/orders/[id]/pay/page.tsx"), "utf8");

    expect(payPage).toContain('order.orderStatus === "cancelled" || order.orderStatus === "refunded"');
    expect(payPage).toContain("order.paymentTransaction && !isTerminalUnpayable");
  });

  it("shows a purchase success hint when mobile payment returns to login", () => {
    const loginPage = readFileSync(resolve(root, "src/app/(auth)/login/page-shell.tsx"), "utf8");

    expect(loginPage).toContain('params.payment === "success"');
    expect(loginPage).toContain("t.auth.loginSuccessPayment");
  });
});
