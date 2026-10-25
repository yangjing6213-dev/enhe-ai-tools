import { ResetPasswordPageShell, getRecoveryPageMetadata } from "@/app/(auth)/recovery-page-shells";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getRecoveryPageMetadata("zh");
}

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  return <ResetPasswordPageShell searchParams={searchParams} forceLocale="zh" />;
}
