import nodemailer from "nodemailer";

export async function sendAccountRecoveryEmail({
  recipient,
  link,
  purpose,
  locale
}: {
  recipient: string;
  link: string;
  purpose: "verify_recovery_email" | "reset_password";
  locale: "zh" | "en";
}) {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim() || user;
  if (!host || !Number.isInteger(port) || port <= 0 || !from) {
    throw new Error("ACCOUNT_RECOVERY_EMAIL_NOT_CONFIGURED");
  }

  const isVerification = purpose === "verify_recovery_email";
  const subject = locale === "en"
    ? (isVerification ? "Verify your ENHE AI recovery email" : "Reset your ENHE AI password")
    : (isVerification ? "验证 ENHE AI 找回邮箱" : "重置 ENHE AI 密码");
  const heading = locale === "en"
    ? (isVerification ? "Verify your recovery email" : "Reset your password")
    : (isVerification ? "验证找回邮箱" : "重置密码");
  const explanation = locale === "en"
    ? "This one-time link expires in 30 minutes. If you did not request it, you can ignore this email."
    : "此链接仅可使用一次，并将在 30 分钟后失效。如果这不是你发起的操作，请忽略本邮件。";
  const buttonLabel = locale === "en"
    ? (isVerification ? "Verify email" : "Reset password")
    : (isVerification ? "验证邮箱" : "重置密码");
  const safeLink = escapeHtml(link);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || (process.env.SMTP_SECURE !== "false" && port === 465),
    auth: user && password ? { user, pass: password } : undefined,
    connectionTimeout: readTimeout("SMTP_CONNECTION_TIMEOUT_MS", 8000),
    greetingTimeout: readTimeout("SMTP_GREETING_TIMEOUT_MS", 8000),
    socketTimeout: readTimeout("SMTP_SOCKET_TIMEOUT_MS", 12000)
  });

  await transporter.sendMail({
    from,
    to: recipient,
    subject,
    text: `${heading}\n\n${explanation}\n\n${link}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>${heading}</h2><p>${explanation}</p><p><a href="${safeLink}">${buttonLabel}</a></p><p>${safeLink}</p></div>`
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}

function readTimeout(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
