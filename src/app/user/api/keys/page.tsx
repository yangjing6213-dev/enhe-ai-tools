import type { Metadata } from "next";
import { ApiKeysPage } from "@/features/enhe-api/components/api-keys-page";
import { listApiKeysForCurrentUser } from "@/features/enhe-api/server/api-keys";

export const metadata: Metadata = {
  title: "API 密钥 | ENHE API"
};

export default async function UserApiKeysPage() {
  const result = await listApiKeysForCurrentUser();

  return (
    <ApiKeysPage
      keys={result.keys.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        status: key.status,
        createdAt: formatDateTime(key.createdAt),
        lastUsedAt: key.lastUsedAt ? formatDateTime(key.lastUsedAt) : null,
        revokedAt: key.revokedAt ? formatDateTime(key.revokedAt) : null,
        todayRequestCount: key.todayRequestCount,
        todayUsageUsd: key.todayUsageUsd
      }))}
      activeCount={result.activeCount}
      maxActiveKeys={result.maxActiveKeys}
      developerStatus={result.developerStatus}
    />
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(value);
}
