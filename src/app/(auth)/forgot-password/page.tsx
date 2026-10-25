import { ForgotPasswordPageShell, getRecoveryPageMetadata } from "@/app/(auth)/recovery-page-shells";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getRecoveryPageMetadata("zh");
}

export default function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <ForgotPasswordPageShell searchParams={searchParams} forceLocale="zh" />;
}
