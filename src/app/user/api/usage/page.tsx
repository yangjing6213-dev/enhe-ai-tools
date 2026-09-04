import type { Metadata } from "next";
import { UsagePage } from "@/features/enhe-api/components/usage-page";
import { getWalletSummaryForCurrentUser } from "@/features/enhe-api/server/wallet";

export const metadata: Metadata = {
  title: "API 用量 | ENHE API"
};

export default async function UserApiUsagePage() {
  const summary = await getWalletSummaryForCurrentUser();

  return <UsagePage summary={summary} />;
}
