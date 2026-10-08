import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaymentQrCode } from "@/components/payment-qr-code";

describe("PaymentQrCode", () => {
  it("renders a payment URL as an accessible SVG QR code without exposing the URL as text", () => {
    const paymentUrl = "https://pay.example.test/checkout/order-123";
    const html = renderToStaticMarkup(
      <PaymentQrCode value={paymentUrl} label="支付宝支付二维码" />,
    );

    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="支付宝支付二维码"');
    expect(html).not.toContain(paymentUrl);
  });
});
