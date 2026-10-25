import { ForgotPasswordPageShell, getRecoveryPageMetadata } from "@/app/(auth)/recovery-page-shells";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return getRecoveryPageMetadata("en");
}

export default function EnglishForgotPasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <ForgotPasswordPageShell searchParams={searchParams} forceLocale="en" />;
}
