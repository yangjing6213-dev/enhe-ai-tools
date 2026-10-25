import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mocks } = vi.hoisted(() => {
  const mocks = {
    sendMail: vi.fn(async (_message: Record<string, unknown>) => ({ messageId: "local-test-message" })),
    createTransport: vi.fn(() => ({ sendMail: mocks.sendMail })),
  };
  return { mocks };
});

vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));

const envKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_SECURE"] as const;
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

describe("account recovery email", () => {
  beforeEach(() => {
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "noreply@example.test";
    process.env.SMTP_PASSWORD = "local-test-password";
    process.env.SMTP_FROM = "ENHE AI <noreply@example.test>";
    delete process.env.SMTP_SECURE;
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = originalEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("sends a localized one-time recovery link through configured SMTP without writing to an external server in tests", async () => {
    const { sendAccountRecoveryEmail } = await import("@/lib/account-recovery-email");
    const link = "https://www.enhe-tech.com.cn/reset-password?token=one-time";

    await sendAccountRecoveryEmail({
      recipient: "verified@example.com",
      link,
      purpose: "reset_password",
      locale: "zh",
    });

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.example.test",
      port: 465,
      secure: true,
      auth: { user: "noreply@example.test", pass: "local-test-password" },
    }));
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "verified@example.com",
      subject: "重置 ENHE AI 密码",
      text: expect.stringContaining("30 分钟"),
    }));
    const message = mocks.sendMail.mock.calls[0]?.[0];
    expect(message?.text).toContain(link);
  });

  it("fails closed when SMTP is not configured", async () => {
    delete process.env.SMTP_HOST;
    const { sendAccountRecoveryEmail } = await import("@/lib/account-recovery-email");

    await expect(sendAccountRecoveryEmail({
      recipient: "verified@example.com",
      link: "https://www.enhe-tech.com.cn/reset-password?token=one-time",
      purpose: "reset_password",
      locale: "en",
    })).rejects.toThrow("ACCOUNT_RECOVERY_EMAIL_NOT_CONFIGURED");
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
