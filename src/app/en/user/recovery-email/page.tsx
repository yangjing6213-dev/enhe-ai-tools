import { RecoveryEmailPageShell } from "@/app/user/recovery-email/page-shell";

export const dynamic = "force-dynamic";

export default function EnglishRecoveryEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <RecoveryEmailPageShell searchParams={searchParams} forceLocale="en" />;
}
