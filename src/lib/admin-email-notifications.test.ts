import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";
import {
  buildAdminMailOptions,
  buildAdminOperationEmail,
  getAdminAlertEmailConfig
} from "@/lib/admin-email-notifications";

describe("admin email notifications", () => {
  it("builds payment review email with order details and admin links", () => {
    const email = buildAdminOperationEmail({
      eventType: "payment_review_approved",
      appUrl: "https://www.enhe-tech.com.cn",
      actorLabel: "admin@enhe.ai",
      note: "凭证审核通过",
      order: {
        id: "order-1",
        orderNo: "ENHE202606080001",
        userLabel: "user@example.com",
        itemName: "AI Video Studio",
        amount: "9.90",
        paymentMethod: "alipay",
        orderStatus: "activated"
      }
    });

    expect(email.subject).toBe("[ENHE AI] 付款审核通过并开通权益：ENHE202606080001");
    expect(email.text).toContain("订单号：ENHE202606080001");
    expect(email.text).toContain("用户：user@example.com");
    expect(email.text).toContain("项目：AI Video Studio");
    expect(email.text).toContain("金额：¥9.90");
    expect(email.text).toContain("操作人：admin@enhe.ai");
    expect(email.text).toContain("后台订单：https://www.enhe-tech.com.cn/admin/orders/order-1");
    expect(email.text).toContain("用户订单：https://www.enhe-tech.com.cn/orders/order-1");
    expect(email.html).toContain("https://www.enhe-tech.com.cn/admin/orders/order-1");
  });

  it("builds new order and user receipt emails with order links", () => {
    const order = {
      id: "order-1",
      orderNo: "ENHE202606110001",
      userLabel: "user@example.com",
      itemName: "AI Video Studio",
      amount: "35.00",
      paymentMethod: "wechat",
      orderStatus: "pending_payment"
    };

    const newOrderEmail = buildAdminOperationEmail({
      eventType: "order_created",
      appUrl: "https://www.enhe-tech.com.cn",
      order,
      extraLines: [["购买规格", "单机授权"]]
    });

    expect(newOrderEmail.subject).toBe("[ENHE AI] 新订单：ENHE202606110001");
    expect(newOrderEmail.text).toContain("操作类型：新订单已创建");
    expect(newOrderEmail.text).toContain("购买规格：单机授权");
    expect(newOrderEmail.text).toContain("后台订单：https://www.enhe-tech.com.cn/admin/orders/order-1");
    expect(newOrderEmail.text).toContain("用户订单：https://www.enhe-tech.com.cn/orders/order-1");

    const receiptEmail = buildAdminOperationEmail({
      eventType: "order_receipt_submitted",
      appUrl: "https://www.enhe-tech.com.cn",
      actorLabel: "user@example.com",
      order,
      extraLines: [["用户回执", "已付款，请帮我确认授权账号。"]]
    });

    expect(receiptEmail.subject).toBe("[ENHE AI] 用户回执：ENHE202606110001");
    expect(receiptEmail.text).toContain("操作类型：用户提交订单回执");
    expect(receiptEmail.text).toContain("操作人：user@example.com");
    expect(receiptEmail.text).toContain("用户回执：已付款，请帮我确认授权账号。");
  });

  it("uses the requested Gmail address as the default admin recipient", () => {
    const config = getAdminAlertEmailConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "mailer@example.com",
      SMTP_PASSWORD: "secret",
      SMTP_FROM: "ENHE AI <mailer@example.com>"
    });

    expect(config.recipients).toEqual(["huqingwei5942@gmail.com"]);
    expect(config.enabled).toBe(true);
  });

  it("renders Chinese admin emails with explicit UTF-8 MIME encoding", async () => {
    const email = buildAdminOperationEmail({
      eventType: "payment_review_approved",
      appUrl: "https://www.enhe-tech.com.cn",
      actorLabel: "恩禾管理员",
      note: "凭证审核通过，请查看订单。",
      order: {
        id: "order-1",
        orderNo: "ENHE202606080001",
        userLabel: "user@example.com",
        itemName: "AI Video Studio",
        amount: "9.90",
        paymentMethod: "alipay",
        orderStatus: "activated"
      }
    });
    const mailOptions = buildAdminMailOptions(
      {
        from: "ENHE AI <huqingwei5942@gmail.com>",
        recipients: ["huqingwei5942@gmail.com"]
      },
      email
    );

    expect(mailOptions.encoding).toBe("utf-8");
    expect(mailOptions.textEncoding).toBe("base64");

    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const info = await transport.sendMail(mailOptions);
    const rawMessage = info.message.toString("utf8");

    expect(rawMessage).toContain("Content-Type: text/plain; charset=utf-8");
    expect(rawMessage).toContain("Content-Transfer-Encoding: base64");
    expect(rawMessage).toContain("Subject: =?UTF-8?");
  });
});
