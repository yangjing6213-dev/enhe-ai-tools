import { VerifyRecoveryEmailPageShell, getRecoveryPageMetadata } from "@/app/(auth)/recovery-page-shells";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getRecoveryPageMetadata("zh");
}

export default function VerifyRecoveryEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  return <VerifyRecoveryEmailPageShell searchParams={searchParams} forceLocale="zh" />;
}
