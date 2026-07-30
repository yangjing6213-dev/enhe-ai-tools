import { createHash, timingSafeEqual } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join } from "node:path";

export type ZpayMode = "disabled" | "live";
export type ZpayPaymentType = "alipay" | "wxpay";

export type ZpayConfig = {
  mode: ZpayMode;
  apiBase: string;
  pid: string;
  key: string;
  defaultType: ZpayPaymentType;
  channelId?: string;
  siteUrl: string;
};

type LoadZpayConfigInput = {
  cwd?: string;
  env?: Record<string, string | undefined>;
};

function parseEnvFile(path: string) {
  if (!path || !existsSync(path)) return {};
  const result: Record<string, string> = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

function readConfigValue(
  key: string,
  env: Record<string, string | undefined>,
  fileEnv: Record<string, string>,
) {
  return (env[key] ?? fileEnv[key] ?? "").trim();
}

function normalizeOrigin(value: string, label: string) {
  const normalized = value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^/]+$/i.test(normalized)) {
    throw new Error(`${label} must be a full http(s) origin.`);
  }
  return normalized;
}

function normalizeMode(value: string): ZpayMode {
  if (!value || value === "disabled") return "disabled";
  if (value === "live") return "live";
  throw new Error("ZPAY_MODE must be disabled or live.");
}

function normalizePaymentType(value: string): ZpayPaymentType {
  if (value === "alipay" || value === "wxpay") return value;
  throw new Error("ZPAY_DEFAULT_TYPE must be alipay or wxpay.");
}

function resolveExplicitEnvFile(
  value: string | undefined,
  cwd: string,
) {
  const path = value?.trim() ?? "";
  if (!path) return "";
  return isAbsolute(path) ? path : join(cwd, path);
}

export function loadZpayConfig(input: LoadZpayConfigInput = {}): ZpayConfig {
  const cwd = input.cwd ?? process.cwd();
  const env = input.env ?? process.env;
  const fileEnv = parseEnvFile(resolveExplicitEnvFile(env.ZPAY_ENV_FILE, cwd));

  const mode = normalizeMode(readConfigValue("ZPAY_MODE", env, fileEnv));
  const apiBase = normalizeOrigin(
    readConfigValue("ZPAY_API_BASE", env, fileEnv) || "https://zpayz.cn",
    "ZPAY_API_BASE",
  );
  const pid = readConfigValue("ZPAY_PID", env, fileEnv);
  const key = readConfigValue("ZPAY_KEY", env, fileEnv);
  const defaultType = normalizePaymentType(
    readConfigValue("ZPAY_DEFAULT_TYPE", env, fileEnv) || "alipay",
  );
  const channelId =
    readConfigValue("ZPAY_CHANNEL_ID", env, fileEnv) || undefined;
  const siteUrl = normalizeOrigin(
    readConfigValue("NEXT_PUBLIC_SITE_URL", env, fileEnv) ||
      readConfigValue("NEXT_PUBLIC_APP_URL", env, fileEnv) ||
      readConfigValue("APP_URL", env, fileEnv),
    "NEXT_PUBLIC_SITE_URL",
  );

  if (mode === "live") {
    if (!pid) throw new Error("ZPAY_PID is required in live mode.");
    if (!key) throw new Error("ZPAY_KEY is required in live mode.");
  }

  return { mode, apiBase, pid, key, defaultType, channelId, siteUrl };
}

export function assertZpayPaymentCreationAllowed(config: ZpayConfig) {
  if (config.mode !== "live") throw new Error("ZPAY_PAYMENT_DISABLED");
  if (!config.pid || !config.key) throw new Error("ZPAY_LIVE_CONFIG_INVALID");
}

function validConfirmationValue(value: string) {
  return value.length >= 24 && value.length <= 512 && !/\s/.test(value);
}

function confirmationMatches(candidate: string, expected: string) {
  const candidateHash = createHash("sha256").update(candidate, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function consumeZpayRefundConfirmation(
  input: { refundId: string; confirmationValue?: string | null },
  env: Record<string, string | undefined> = process.env,
) {
  if ((env.ZPAY_MODE ?? "disabled").trim() !== "live") {
    throw new Error("ZPAY_PAYMENT_DISABLED");
  }
  if ((env.ZPAY_REFUND_ENABLED ?? "false").trim() !== "true") {
    throw new Error("ZPAY_REFUND_DISABLED");
  }

  const expected = env.ZPAY_REFUND_CONFIRMATION_VALUE?.trim() ?? "";
  const candidate = input.confirmationValue?.trim() ?? "";
  if (
    !validConfirmationValue(expected) ||
    !validConfirmationValue(candidate) ||
    !confirmationMatches(candidate, expected)
  ) {
    throw new Error("ZPAY_REFUND_CONFIRMATION_INVALID");
  }

  const store = env.ZPAY_REFUND_CONFIRMATION_STORE?.trim() ?? "";
  if (!store || !isAbsolute(store)) {
    throw new Error("ZPAY_REFUND_CONFIRMATION_STORE_INVALID");
  }

  mkdirSync(store, { recursive: true, mode: 0o700 });
  const markerName = `${createHash("sha256")
    .update(`zpay-refund-confirmation:v1:${expected}`, "utf8")
    .digest("hex")}.used`;
  const markerPath = join(store, markerName);
  let descriptor: number | null = null;
  try {
    descriptor = openSync(markerPath, "wx", 0o600);
    writeFileSync(
      descriptor,
      JSON.stringify({ refundId: input.refundId, consumedAt: new Date().toISOString() }),
      "utf8",
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      throw new Error("ZPAY_REFUND_CONFIRMATION_ALREADY_USED");
    }
    throw new Error("ZPAY_REFUND_CONFIRMATION_STORE_ERROR");
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}
