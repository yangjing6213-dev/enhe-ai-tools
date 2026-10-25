import { VerifyRecoveryEmailPageShell, getRecoveryPageMetadata } from "@/app/(auth)/recovery-page-shells";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getRecoveryPageMetadata("en");
}

export default function EnglishVerifyRecoveryEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  return <VerifyRecoveryEmailPageShell searchParams={searchParams} forceLocale="en" />;
}
