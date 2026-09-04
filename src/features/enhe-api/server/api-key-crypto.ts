import { createHmac, randomBytes } from "node:crypto";

const apiKeyPrefix = "enhe_sk_live_";
const apiKeySecretBytes = 24;
const apiKeyHashVersion = 1;
const minPepperLength = 32;
const apiKeyPattern = /^enhe_sk_live_[A-Za-z0-9_-]{32,}$/;

type ApiKeyConfigError = "missing_pepper" | "weak_pepper";

export type ApiKeyHashResult =
  | { ok: true; hash: string; hashVersion: typeof apiKeyHashVersion }
  | { ok: false; reason: ApiKeyConfigError | "invalid_format" };

export function createApiKeySecret() {
  return `${apiKeyPrefix}${randomBytes(apiKeySecretBytes).toString("base64url")}`;
}

export function formatApiKeyPrefix(apiKey: string) {
  return `${apiKey.slice(0, apiKeyPrefix.length + 4)}...${apiKey.slice(-4)}`;
}

export function isApiKeyFormatValid(value: string) {
  return apiKeyPattern.test(value);
}

export function validateApiKeyHashConfiguration(): { ok: true } | { ok: false; reason: ApiKeyConfigError } {
  const pepper = process.env.ENHE_API_KEY_PEPPER;
  if (!pepper) return { ok: false, reason: "missing_pepper" };
  if (pepper.length < minPepperLength) return { ok: false, reason: "weak_pepper" };
  return { ok: true };
}

export function hashApiKey(apiKey: string): ApiKeyHashResult {
  if (!isApiKeyFormatValid(apiKey)) return { ok: false, reason: "invalid_format" };

  const pepper = process.env.ENHE_API_KEY_PEPPER;
  if (!pepper) return { ok: false, reason: "missing_pepper" };
  if (pepper.length < minPepperLength) return { ok: false, reason: "weak_pepper" };

  return {
    ok: true,
    hash: createHmac("sha256", pepper).update(apiKey, "utf8").digest("hex"),
    hashVersion: apiKeyHashVersion
  };
}

export function getApiKeyConfigurationErrorMessage(reason: ApiKeyConfigError) {
  if (reason === "weak_pepper") {
    return "API Key 服务配置不完整，请联系 ENHE 管理员处理。";
  }
  return "API Key 服务暂未配置，请联系 ENHE 管理员处理。";
}
