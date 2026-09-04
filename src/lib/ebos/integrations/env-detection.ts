import type { EbosEnvPresence } from "./integration-types";

export type EbosEnvMap = Record<string, string | undefined>;

export function checkEnvPresence(requiredKeys: string[], env: EbosEnvMap = process.env): EbosEnvPresence[] {
  return requiredKeys.map((key) => ({
    key,
    maskedKey: maskEnvKeyName(key),
    configured: isPresent(env[key])
  }));
}

export function maskEnvKeyName(key: string) {
  const parts = key.split("_").filter(Boolean);
  if (parts.length < 2) return key;
  return `${parts[0]}...${parts[parts.length - 1]}`;
}

function isPresent(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}
