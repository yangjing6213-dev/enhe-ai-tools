import { pathToFileURL } from "node:url";

type RuntimeEnvironment = Record<string, string | undefined>;

const requiredKeys = [
  "POSTGRES_USER",
  "POSTGRES_DB",
  "POSTGRES_PASSWORD",
  "AUTH_COOKIE_NAME",
  "AUTH_SECRET",
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "AUDIT_WORKER_TOKEN_CURRENT",
  "SEO_AUDIT_ANONYMOUS_HMAC_SECRET",
  "SEO_AUDIT_ENGINE_SHA256",
  "ZPAY_MODE",
  "RELEASE_REF",
] as const;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateDeployConfig(env: RuntimeEnvironment = process.env) {
  const errors: string[] = [];
  const requireValue = (key: string) => {
    const value = env[key]?.trim() ?? "";
    if (!value) errors.push(`${key} is required`);
    return value;
  };

  for (const key of requiredKeys) requireValue(key);

  for (const key of ["POSTGRES_USER", "POSTGRES_DB"] as const) {
    const value = env[key] ?? "";
    if (value && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
      errors.push(`${key} must be a PostgreSQL identifier`);
    }
  }

  const databasePassword = env.POSTGRES_PASSWORD ?? "";
  if (databasePassword && !/^[A-Za-z0-9._~-]+$/.test(databasePassword)) {
    errors.push(
      "POSTGRES_PASSWORD must use URL-safe letters, numbers, dots, underscores, tildes, or hyphens",
    );
  }

  for (const key of ["APP_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL"] as const) {
    const value = env[key] ?? "";
    if (value && !isHttpUrl(value)) errors.push(`${key} must be an HTTP(S) URL`);
  }

  if ((env.AUTH_SECRET?.length ?? 0) < 32) {
    errors.push("AUTH_SECRET must contain at least 32 characters");
  }

  const workerToken = env.AUDIT_WORKER_TOKEN_CURRENT ?? "";
  if (workerToken.length < 24 || workerToken.length > 512 || /\s/.test(workerToken)) {
    errors.push("AUDIT_WORKER_TOKEN_CURRENT must contain 24 to 512 non-whitespace characters");
  }

  if ((env.SEO_AUDIT_ANONYMOUS_HMAC_SECRET?.length ?? 0) < 32) {
    errors.push("SEO_AUDIT_ANONYMOUS_HMAC_SECRET must contain at least 32 characters");
  }
  if (!/^[0-9a-f]{64}$/i.test(env.SEO_AUDIT_ENGINE_SHA256 ?? "")) {
    errors.push("SEO_AUDIT_ENGINE_SHA256 must be a 64-character hexadecimal digest");
  }
  if (!/^[0-9a-f]{40}$/i.test(env.RELEASE_REF ?? "")) {
    errors.push("RELEASE_REF must be exactly 40 hexadecimal characters");
  }

  const paymentMode = env.ZPAY_MODE?.trim();
  if (paymentMode !== "live" && paymentMode !== "disabled") {
    errors.push("ZPAY_MODE must be disabled or live");
  } else if (paymentMode === "live") {
    requireValue("ZPAY_PID");
    requireValue("ZPAY_KEY");
  }

  const mailEnabled = env.ADMIN_EMAIL_NOTIFICATIONS_ENABLED?.trim() || "false";
  if (mailEnabled !== "true" && mailEnabled !== "false") {
    errors.push("ADMIN_EMAIL_NOTIFICATIONS_ENABLED must be true or false");
  } else if (mailEnabled === "true") {
    for (const key of [
      "ADMIN_ALERT_EMAILS",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_FROM",
    ]) {
      requireValue(key);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid deployment configuration:\n- ${[...new Set(errors)].join("\n- ")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    validateDeployConfig();
    console.log("Deployment configuration is valid.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid deployment configuration.");
    process.exitCode = 1;
  }
}
