import type { Metadata } from "next";
import { UsageLogsPage } from "@/features/enhe-api/components/usage-logs-page";
import { listUsageLogsForCurrentUser, type UsageLogSearchParams } from "@/features/enhe-api/server/usage-logs";

export const metadata: Metadata = {
  title: "请求日志 | ENHE API"
};

export default async function UserApiLogsPage({ searchParams }: { searchParams?: Promise<UsageLogSearchParams> }) {
  const result = await listUsageLogsForCurrentUser(searchParams ? await searchParams : {});
  return <UsageLogsPage result={result} />;
}
