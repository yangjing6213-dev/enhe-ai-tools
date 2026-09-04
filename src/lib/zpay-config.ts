import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type ZpayPaymentType = "alipay" | "wxpay";

export type ZpayConfig = {
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
  if (!existsSync(path)) return {};
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

function readConfigValue(key: string, env: Record<string, string | undefined>, fileEnv: Record<string, string>) {
  return (env[key] ?? fileEnv[key] ?? "").trim();
}

function normalizeOrigin(value: string, label: string) {
  const normalized = value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^/]+/i.test(normalized)) {
    throw new Error(`${label} must be a full http(s) origin.`);
  }
  return normalized;
}

function normalizePaymentType(value: string): ZpayPaymentType {
  if (value === "alipay" || value === "wxpay") return value;
  throw new Error("ZPAY_DEFAULT_TYPE must be alipay or wxpay.");
}

export function loadZpayConfig(input: LoadZpayConfigInput = {}): ZpayConfig {
  const cwd = input.cwd ?? process.cwd();
  const env = input.env ?? process.env;
  const fileEnv = {
    ...parseEnvFile(join(cwd, "zpay.env")),
    ...parseEnvFile(env.ZPAY_ENV_FILE ?? "")
  };

  const apiBase = normalizeOrigin(readConfigValue("ZPAY_API_BASE", env, fileEnv) || "https://zpayz.cn", "ZPAY_API_BASE");
  const pid = readConfigValue("ZPAY_PID", env, fileEnv);
  const key = readConfigValue("ZPAY_KEY", env, fileEnv);
  const defaultType = normalizePaymentType(readConfigValue("ZPAY_DEFAULT_TYPE", env, fileEnv) || "alipay");
  const channelId = readConfigValue("ZPAY_CHANNEL_ID", env, fileEnv) || undefined;
  const siteUrl = normalizeOrigin(
    readConfigValue("NEXT_PUBLIC_SITE_URL", env, fileEnv) ||
      readConfigValue("NEXT_PUBLIC_APP_URL", env, fileEnv) ||
      readConfigValue("APP_URL", env, fileEnv),
    "NEXT_PUBLIC_SITE_URL"
  );

  if (!pid) throw new Error("ZPAY_PID is required.");
  if (!key) throw new Error("ZPAY_KEY is required.");

  return { apiBase, pid, key, defaultType, channelId, siteUrl };
}
