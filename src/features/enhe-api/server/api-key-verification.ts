import { prisma } from "@/lib/db";
import { hashApiKey, isApiKeyFormatValid } from "./api-key-crypto";

export type VerifyApiKeyResult =
  | {
      valid: true;
      userId: string;
      developerProfileId: string;
      apiKeyId: string;
      keyPrefix: string;
      developerStatus: "active";
    }
  | { valid: false; reason: "invalid_api_key" | "developer_suspended" | "user_disabled" | "server_misconfigured" };

export async function verifyApiKey(apiKey: string): Promise<VerifyApiKeyResult> {
  if (!isApiKeyFormatValid(apiKey)) return { valid: false, reason: "invalid_api_key" };

  const hashResult = hashApiKey(apiKey);
  if (!hashResult.ok) {
    return {
      valid: false,
      reason: hashResult.reason === "invalid_format" ? "invalid_api_key" : "server_misconfigured"
    };
  }

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashResult.hash },
    select: {
      id: true,
      userId: true,
      developerProfileId: true,
      keyPrefix: true,
      status: true,
      developerProfile: { select: { status: true } },
      user: { select: { status: true } }
    }
  });

  if (!key || key.status !== "active") {
    return { valid: false, reason: "invalid_api_key" };
  }
  if (key.developerProfile.status !== "active") {
    return { valid: false, reason: "developer_suspended" };
  }
  if (key.user.status !== "active") {
    return { valid: false, reason: "user_disabled" };
  }

  return {
    valid: true,
    userId: key.userId,
    developerProfileId: key.developerProfileId,
    apiKeyId: key.id,
    keyPrefix: key.keyPrefix,
    developerStatus: "active"
  };
}
