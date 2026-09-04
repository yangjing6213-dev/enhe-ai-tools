import { Prisma, type ApiDeveloperProfileStatus, type ApiKey, type ApiKeyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getOrCreateApiDeveloperProfile, type ApiDeveloperProfileUser } from "./developer-profile";
import {
  createApiKeySecret,
  formatApiKeyPrefix,
  getApiKeyConfigurationErrorMessage,
  hashApiKey,
  validateApiKeyHashConfiguration
} from "./api-key-crypto";
import { getTodayApiKeyUsageForUser, type ApiKeyTodayUsage } from "./usage-logs";
export { verifyApiKey } from "./api-key-verification";
export type { VerifyApiKeyResult } from "./api-key-verification";

export const maxActiveApiKeys = 20;

export type ApiKeyListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  status: ApiKeyStatus;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  todayRequestCount: number;
  todayUsageUsd: number;
};

export type ListApiKeysResult = {
  keys: ApiKeyListItem[];
  activeCount: number;
  maxActiveKeys: number;
  developerStatus: ApiDeveloperProfileStatus;
};

export type CreateApiKeyResult =
  | {
      ok: true;
      plainKey: string;
      key: ApiKeyListItem;
      activeCount: number;
      maxActiveKeys: number;
    }
  | { ok: false; code: "validation_error" | "developer_not_active" | "key_limit_reached" | "server_misconfigured" | "create_failed"; message: string };

export type RevokeApiKeyResult =
  | { ok: true; key: ApiKeyListItem }
  | { ok: false; code: "validation_error" | "not_found" | "revoke_failed"; message: string };

export async function listApiKeysForCurrentUser(): Promise<ListApiKeysResult> {
  const user = await requireUser();
  const developerProfile = await getOrCreateApiDeveloperProfile(user);
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  const todayUsageByKey = await getTodayApiKeyUsageForUser(user.id, keys.map((key) => key.id));

  return {
    keys: keys.map((key) => mapApiKeyListItem(key, todayUsageByKey.get(key.id))),
    activeCount: keys.filter((key) => key.status === "active").length,
    maxActiveKeys: maxActiveApiKeys,
    developerStatus: developerProfile.status
  };
}

export async function createApiKeyForUser(
  user: ApiDeveloperProfileUser,
  rawName: FormDataEntryValue | null
): Promise<CreateApiKeyResult> {
  const nameValidation = validateApiKeyName(rawName);
  if (!nameValidation.ok) return nameValidation;

  const configuration = validateApiKeyHashConfiguration();
  if (!configuration.ok) {
    return {
      ok: false,
      code: "server_misconfigured",
      message: getApiKeyConfigurationErrorMessage(configuration.reason)
    };
  }

  const developerProfile = await getOrCreateApiDeveloperProfile(user);
  if (developerProfile.status !== "active") {
    return {
      ok: false,
      code: "developer_not_active",
      message: "当前开发者资料状态受限，暂不能创建新的 API Key。"
    };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const plainKey = createApiKeySecret();
    const hashResult = hashApiKey(plainKey);
    if (!hashResult.ok) {
      return {
        ok: false,
        code: "server_misconfigured",
        message: hashResult.reason === "invalid_format"
          ? "API Key 生成失败，请稍后重试。"
          : getApiKeyConfigurationErrorMessage(hashResult.reason)
      };
    }

    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const activeCount = await tx.apiKey.count({
            where: { developerProfileId: developerProfile.id, status: "active" }
          });

          if (activeCount >= maxActiveApiKeys) {
            return { type: "limit" as const };
          }

          const key = await tx.apiKey.create({
            data: {
              userId: user.id,
              developerProfileId: developerProfile.id,
              name: nameValidation.name,
              keyPrefix: formatApiKeyPrefix(plainKey),
              keyHash: hashResult.hash,
              keyHashVersion: hashResult.hashVersion
            }
          });

          return { type: "created" as const, key, activeCount: activeCount + 1 };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      if (created.type === "limit") {
        return {
          ok: false,
          code: "key_limit_reached",
          message: `最多只能保留 ${maxActiveApiKeys} 个启用状态的 API Key。`
        };
      }

      return {
        ok: true,
        plainKey,
        key: mapApiKeyListItem(created.key),
        activeCount: created.activeCount,
        maxActiveKeys: maxActiveApiKeys
      };
    } catch (error) {
      if (isRetryableCreateError(error)) continue;

      return {
        ok: false,
        code: "create_failed",
        message: "API Key 创建失败，请稍后重试。"
      };
    }
  }

  return {
    ok: false,
    code: "create_failed",
    message: "API Key 创建失败，请稍后重试。"
  };
}

export async function revokeApiKeyForUser(user: ApiDeveloperProfileUser, rawApiKeyId: FormDataEntryValue | null): Promise<RevokeApiKeyResult> {
  const apiKeyId = String(rawApiKeyId ?? "").trim();
  if (!apiKeyId || apiKeyId.length > 128) {
    return { ok: false, code: "validation_error", message: "API Key 参数无效。" };
  }

  try {
    const existing = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId: user.id }
    });

    if (!existing) {
      return { ok: false, code: "not_found", message: "未找到可撤销的 API Key。" };
    }

    if (existing.status === "revoked") {
      return { ok: true, key: mapApiKeyListItem(existing) };
    }

    const revoked = await prisma.apiKey.update({
      where: { id: existing.id },
      data: { status: "revoked", revokedAt: new Date() }
    });

    return { ok: true, key: mapApiKeyListItem(revoked) };
  } catch {
    return { ok: false, code: "revoke_failed", message: "API Key 撤销失败，请稍后重试。" };
  }
}

function validateApiKeyName(value: FormDataEntryValue | null):
  | { ok: true; name: string }
  | { ok: false; code: "validation_error"; message: string } {
  const name = String(value ?? "").trim();
  if (!name) {
    return { ok: false, code: "validation_error", message: "请输入 API Key 名称。" };
  }
  if (name.length > 40) {
    return { ok: false, code: "validation_error", message: "API Key 名称不能超过 40 个字符。" };
  }
  return { ok: true, name };
}

function mapApiKeyListItem(
  key: Pick<ApiKey, "id" | "name" | "keyPrefix" | "status" | "createdAt" | "lastUsedAt" | "revokedAt">,
  todayUsage?: ApiKeyTodayUsage
): ApiKeyListItem {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    status: key.status,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    todayRequestCount: todayUsage?.requestCount ?? 0,
    todayUsageUsd: todayUsage?.usageUsd ?? 0
  };
}

function isRetryableCreateError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034");
}
