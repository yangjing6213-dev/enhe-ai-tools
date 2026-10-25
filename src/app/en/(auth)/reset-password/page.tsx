import { ResetPasswordPageShell, getRecoveryPageMetadata } from "@/app/(auth)/recovery-page-shells";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getRecoveryPageMetadata("en");
}

export default function EnglishResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  return <ResetPasswordPageShell searchParams={searchParams} forceLocale="en" />;
}
