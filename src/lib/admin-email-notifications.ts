import nodemailer from "nodemailer";
import type { SendMailOptions, Transporter } from "nodemailer";
import { prisma } from "@/lib/db";

const defaultAdminAlertEmail = "huqingwei5942@gmail.com";

type EnvLike = Record<string, string | undefined>;

export type AdminAlertEmailConfig = {
  enabled: boolean;
  recipients: string[];
  host?: string;
  port?: number;
  secure: boolean;
  user?: string;
  password?: string;
  from?: string;
  skipReason?: string;
};

type AdminOperationEmailEvent =
  | "order_created"
  | "order_receipt_submitted"
  | "payment_proof_submitted"
  | "payment_review_approved"
  | "payment_review_rejected"
  | "refund_request_submitted"
  | "refund_processed_completed"
  | "refund_processed_rejected"
  | "manual_vip_grant"
  | "manual_vip_cancel";

type AdminOperationEmailInput = {
  eventType: AdminOperationEmailEvent;
  appUrl?: string;
  actorLabel?: string | null;
  note?: string | null;
  extraLines?: Array<[string, string | null | undefined]>;
  order?: {
    id: string;
    orderNo: string;
    userLabel: string;
    itemName: string;
    amount: string | number;
    paymentMethod?: string | null;
    orderStatus?: string | null;
  };
  user?: {
    id: string;
    label: string;
    vipType?: string | null;
  };
};

type AdminOperationEmail = {
  subject: string;
  text: string;
  html: string;
};

type Mailer = Pick<Transporter, "sendMail">;

const eventCopy: Record<AdminOperationEmailEvent, { label: string; subject: string }> = {
  order_created: {
    label: "新订单已创建",
    subject: "新订单"
  },
  order_receipt_submitted: {
    label: "用户提交订单回执",
    subject: "用户回执"
  },
  payment_proof_submitted: {
    label: "新付款凭证待审核",
    subject: "新付款审核"
  },
  payment_review_approved: {
    label: "付款审核通过，权益已开通",
    subject: "付款审核通过并开通权益"
  },
  payment_review_rejected: {
    label: "付款审核驳回",
    subject: "付款审核驳回"
  },
  refund_request_submitted: {
    label: "新售后/退款申请待处理",
    subject: "新售后/退款申请"
  },
  refund_processed_completed: {
    label: "售后/退款已确认完成",
    subject: "售后/退款处理完成"
  },
  refund_processed_rejected: {
    label: "售后/退款已驳回",
    subject: "售后/退款申请驳回"
  },
  manual_vip_grant: {
    label: "管理员手动开通/延长 VIP",
    subject: "手动VIP开通"
  },
  manual_vip_cancel: {
    label: "管理员手动取消 VIP",
    subject: "手动VIP取消"
  }
};

export function getAdminAlertEmailConfig(env: EnvLike = process.env): AdminAlertEmailConfig {
  const recipients = parseRecipients(env.ADMIN_ALERT_EMAILS ?? env.ADMIN_ALERT_EMAIL ?? defaultAdminAlertEmail);
  const host = env.SMTP_HOST?.trim();
  const port = parsePort(env.SMTP_PORT);
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD;
  const from = env.SMTP_FROM?.trim() || user;
  const secure = parseBoolean(env.SMTP_SECURE, port === 465);
  const explicitlyDisabled = env.ADMIN_EMAIL_NOTIFICATIONS_ENABLED === "false";

  if (explicitlyDisabled) {
    return { enabled: false, recipients, secure, skipReason: "disabled by ADMIN_EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  if (!recipients.length) {
    return { enabled: false, recipients, secure, skipReason: "missing admin email recipients" };
  }

  if (!host || !port || !from) {
    return { enabled: false, recipients, host, port, secure, user, password, from, skipReason: "missing SMTP config" };
  }

  return { enabled: true, recipients, host, port, secure, user, password, from };
}

export function buildAdminOperationEmail(input: AdminOperationEmailInput): AdminOperationEmail {
  const copy = eventCopy[input.eventType];
  const subjectTarget = input.order?.orderNo ?? input.user?.label ?? "系统操作";
  const subject = `[ENHE AI] ${copy.subject}：${subjectTarget}`;
  const appUrl = normalizeAppUrl(input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.enhe-tech.com.cn");
  const lines: Array<[string, string]> = [
    ["操作类型", copy.label],
    ["发生时间", new Date().toLocaleString("zh-CN")]
  ];

  if (input.order) {
    lines.push(
      ["订单号", input.order.orderNo],
      ["用户", input.order.userLabel],
      ["项目", input.order.itemName],
      ["金额", formatYuan(input.order.amount)]
    );
    if (input.order.paymentMethod) lines.push(["支付方式", paymentMethodLabel(input.order.paymentMethod)]);
    if (input.order.orderStatus) lines.push(["订单状态", input.order.orderStatus]);
  }

  if (input.user) {
    lines.push(["用户", input.user.label]);
    if (input.user.vipType) lines.push(["VIP 类型", input.user.vipType]);
  }

  if (input.actorLabel) lines.push(["操作人", input.actorLabel]);
  if (input.note?.trim()) lines.push(["备注", input.note.trim()]);
  for (const [label, value] of input.extraLines ?? []) {
    if (value?.trim()) lines.push([label, value.trim()]);
  }

  const links: Array<[string, string]> = [];
  if (input.order) {
    links.push(["后台订单", `${appUrl}/admin/orders/${input.order.id}`]);
    links.push(["用户订单", `${appUrl}/orders/${input.order.id}`]);
  }
  if (input.user) {
    links.push(["后台用户", `${appUrl}/admin/users/${input.user.id}`]);
  }
  links.push(["后台消息中心", `${appUrl}/admin/messages`]);

  const text = [
    subject,
    "",
    ...lines.map(([label, value]) => `${label}：${value}`),
    "",
    "跳转链接：",
    ...links.map(([label, url]) => `${label}：${url}`)
  ].join("\n");

  const html = `
    <div style="font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.7;color:#0f172a">
      <h2 style="margin:0 0 12px">ENHE AI 管理通知</h2>
      <p style="margin:0 0 16px;color:#475569">${escapeHtml(copy.label)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px">
        ${lines
          .map(
            ([label, value]) => `
              <tr>
                <td style="border:1px solid #e2e8f0;background:#f8fafc;padding:8px 10px;width:120px;font-weight:600">${escapeHtml(label)}</td>
                <td style="border:1px solid #e2e8f0;padding:8px 10px">${escapeHtml(value)}</td>
              </tr>`
          )
          .join("")}
      </table>
      <p style="margin:18px 0 8px;font-weight:600">跳转链接</p>
      <ul>
        ${links.map(([label, url]) => `<li><a href="${escapeAttribute(url)}">${escapeHtml(label)}</a></li>`).join("")}
      </ul>
    </div>
  `;

  return { subject, text, html };
}

export function buildAdminMailOptions(
  config: { from?: string; recipients: string[] },
  email: AdminOperationEmail
): SendMailOptions {
  return {
    from: config.from,
    to: config.recipients,
    subject: email.subject,
    text: email.text,
    html: email.html,
    encoding: "utf-8",
    textEncoding: "base64",
    headers: {
      "Content-Language": "zh-CN"
    }
  };
}

export async function sendNewOrderAdminEmail(orderId: string) {
  await sendOrderAdminEmail(orderId, "order_created");
}

export async function sendOrderReceiptAdminEmail(
  orderId: string,
  input: { receipt: string; actorLabel?: string | null }
) {
  await sendOrderAdminEmail(orderId, "order_receipt_submitted", {
    actorLabel: input.actorLabel,
    extraLines: [["用户回执", input.receipt || "（空）"]]
  });
}

export async function sendPaymentProofSubmittedAdminEmail(orderId: string) {
  await sendOrderAdminEmail(orderId, "payment_proof_submitted");
}

export async function sendPaymentReviewAdminEmail(
  orderId: string,
  input: { decision: "approved" | "rejected"; actorLabel?: string | null; note?: string | null }
) {
  await sendOrderAdminEmail(orderId, input.decision === "approved" ? "payment_review_approved" : "payment_review_rejected", {
    actorLabel: input.actorLabel,
    note: input.note
  });
}

export async function sendRefundRequestAdminEmail(orderId: string, input?: { reason?: string | null; note?: string | null }) {
  await sendOrderAdminEmail(orderId, "refund_request_submitted", {
    note: input?.note,
    extraLines: [["退款原因", input?.reason]]
  });
}

export async function sendRefundProcessedAdminEmail(
  orderId: string,
  input: { status: "completed" | "rejected"; actorLabel?: string | null; note?: string | null }
) {
  await sendOrderAdminEmail(orderId, input.status === "completed" ? "refund_processed_completed" : "refund_processed_rejected", {
    actorLabel: input.actorLabel,
    note: input.note
  });
}

export async function sendManualVipAdjustmentAdminEmail(input: {
  userId: string;
  actionType: "grant" | "cancel";
  vipType: string;
  actorLabel?: string | null;
  reason: string;
}) {
  await safeSend(async () => {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, phone: true, nickname: true }
    });
    if (!user) return;

    const email = buildAdminOperationEmail({
      eventType: input.actionType === "grant" ? "manual_vip_grant" : "manual_vip_cancel",
      actorLabel: input.actorLabel,
      note: input.reason,
      user: {
        id: user.id,
        label: userLabel(user),
        vipType: input.vipType
      }
    });
    await sendAdminEmail(email);
  });
}

export async function sendAdminLoginSecurityEmail(input: {
  userId: string;
  adminLabel: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  await safeSend(async () => {
    const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.enhe-tech.com.cn");
    const subject = `[ENHE AI] 后台管理员登录提醒：${input.adminLabel}`;
    const lines: Array<[string, string]> = [
      ["管理员", input.adminLabel],
      ["用户 ID", input.userId],
      ["登录时间", new Date().toLocaleString("zh-CN")],
      ["IP", input.ip ?? "未知"],
      ["浏览器", input.userAgent ?? "未知"]
    ];
    const links: Array<[string, string]> = [
      ["后台数据看板", `${appUrl}/admin`],
      ["操作审计", `${appUrl}/admin/audit`]
    ];

    await sendAdminEmail({
      subject,
      text: [
        subject,
        "",
        ...lines.map(([label, value]) => `${label}：${value}`),
        "",
        "跳转链接：",
        ...links.map(([label, url]) => `${label}：${url}`)
      ].join("\n"),
      html: `
        <div style="font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.7;color:#0f172a">
          <h2 style="margin:0 0 12px">ENHE AI 管理员登录提醒</h2>
          <p style="margin:0 0 16px;color:#475569">如非本人操作，请立即修改管理员密码并检查服务器登录记录。</p>
          <table style="border-collapse:collapse;width:100%;max-width:720px">
            ${lines
              .map(
                ([label, value]) => `
                  <tr>
                    <td style="border:1px solid #e2e8f0;background:#f8fafc;padding:8px 10px;width:120px;font-weight:600">${escapeHtml(label)}</td>
                    <td style="border:1px solid #e2e8f0;padding:8px 10px">${escapeHtml(value)}</td>
                  </tr>`
              )
              .join("")}
          </table>
          <p style="margin:18px 0 8px;font-weight:600">跳转链接</p>
          <ul>
            ${links.map(([label, url]) => `<li><a href="${escapeAttribute(url)}">${escapeHtml(label)}</a></li>`).join("")}
          </ul>
        </div>
      `
    });
  });
}

async function sendOrderAdminEmail(
  orderId: string,
  eventType: AdminOperationEmailEvent,
  input?: { actorLabel?: string | null; note?: string | null; extraLines?: Array<[string, string | null | undefined]> }
) {
  await safeSend(async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, plan: true, tool: true }
    });
    if (!order) return;

    const extraLines = [...(input?.extraLines ?? [])];
    if (order.toolPriceSpecName) {
      extraLines.unshift(["购买规格", order.toolPriceSpecName]);
    }

    const email = buildAdminOperationEmail({
      eventType,
      actorLabel: input?.actorLabel,
      note: input?.note,
      extraLines,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        userLabel: userLabel(order.user),
        itemName: order.plan?.name ?? order.tool?.name ?? "订单项目",
        amount: order.amount.toString(),
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus
      }
    });
    await sendAdminEmail(email);
  });
}

async function sendAdminEmail(email: AdminOperationEmail) {
  const config = getAdminAlertEmailConfig();
  if (!config.enabled) {
    console.info(`[admin-email] skipped: ${config.skipReason}`);
    return;
  }

  const transporter = createTransporter(config);
  await transporter.sendMail(buildAdminMailOptions(config, email));
}

async function safeSend(send: () => Promise<void>) {
  try {
    await send();
  } catch (error) {
    console.error("[admin-email] failed to send admin notification", error);
  }
}

function createTransporter(config: AdminAlertEmailConfig): Mailer {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    connectionTimeout: parsePositiveInteger(process.env.SMTP_CONNECTION_TIMEOUT_MS, 8000),
    greetingTimeout: parsePositiveInteger(process.env.SMTP_GREETING_TIMEOUT_MS, 8000),
    socketTimeout: parsePositiveInteger(process.env.SMTP_SOCKET_TIMEOUT_MS, 12000)
  });
}

function parseRecipients(value: string) {
  return value
    .split(/[;,]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function parsePort(value?: string) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : undefined;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeAppUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function userLabel(user: { email?: string | null; phone?: string | null; nickname?: string | null; id: string }) {
  return user.email ?? user.phone ?? user.nickname ?? user.id;
}

function paymentMethodLabel(method: string) {
  if (method === "alipay") return "支付宝";
  if (method === "wechat") return "微信";
  return method;
}

function formatYuan(value: string | number) {
  return `¥${Number(value).toFixed(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
