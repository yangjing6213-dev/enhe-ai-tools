import { describe, expect, it } from "vitest";
import { validateDeployConfig } from "../../deploy/enhe-ai-tools/scripts/validate-deploy-config";

const valid = {
  POSTGRES_USER: "enhe_user",
  POSTGRES_DB: "enhe_ai_tools",
  POSTGRES_PASSWORD: "database-secret",
  AUTH_COOKIE_NAME: "enhe_session",
  AUTH_SECRET: "a".repeat(32),
  APP_URL: "https://www.enhe-tech.com.cn",
  NEXT_PUBLIC_APP_URL: "https://www.enhe-tech.com.cn",
  NEXT_PUBLIC_SITE_URL: "https://www.enhe-tech.com.cn",
  AUDIT_WORKER_TOKEN_CURRENT: "w".repeat(24),
  SEO_AUDIT_ANONYMOUS_HMAC_SECRET: "h".repeat(32),
  SEO_AUDIT_ENGINE_SHA256: "f".repeat(64),
  ZPAY_MODE: "live",
  ZPAY_PID: "merchant-id",
  ZPAY_KEY: "payment-secret",
  ADMIN_EMAIL_NOTIFICATIONS_ENABLED: "true",
  ADMIN_ALERT_EMAILS: "owner@example.com",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "465",
  SMTP_USER: "owner@example.com",
  SMTP_PASSWORD: "smtp-secret",
  SMTP_FROM: "ENHE <owner@example.com>",
  RELEASE_REF: "a".repeat(40),
};

describe("deployment runtime configuration validation", () => {
  it("accepts a complete live-payment configuration", () => {
    expect(() => validateDeployConfig(valid)).not.toThrow();
  });

  it("reports key names without echoing secret values", () => {
    const secret = "do-not-leak-this-value";

    expect(() =>
      validateDeployConfig({
        ...valid,
        AUTH_SECRET: secret,
        ZPAY_KEY: "",
      }),
    ).toThrowError(/AUTH_SECRET|ZPAY_KEY/);
    expect(() =>
      validateDeployConfig({
        ...valid,
        AUTH_SECRET: secret,
        ZPAY_KEY: "",
      }),
    ).not.toThrowError(new RegExp(secret));
  });

  it("rejects shell-like tokens only when they violate the documented token format", () => {
    expect(() =>
      validateDeployConfig({
        ...valid,
        AUTH_SECRET: "safe-$-`-secret-with-symbols-12345",
        ZPAY_KEY: "pay-$-`-key",
      }),
    ).not.toThrow();
    expect(() =>
      validateDeployConfig({
        ...valid,
        AUDIT_WORKER_TOKEN_CURRENT: `${"w".repeat(24)} whitespace`,
      }),
    ).toThrowError(/AUDIT_WORKER_TOKEN_CURRENT/);
  });

  it.each(["password/with/slash", "password:with:colon", "password@host", "password%encoded"])(
    "rejects a PostgreSQL password that cannot be interpolated into DATABASE_URL: %s",
    (password) => {
      expect(() =>
        validateDeployConfig({
          ...valid,
          POSTGRES_PASSWORD: password,
        }),
      ).toThrowError(/POSTGRES_PASSWORD/);
    },
  );
});
