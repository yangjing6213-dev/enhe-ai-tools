import { LoginPageShell } from "@/app/(auth)/login/page-shell";

export default function EnglishLoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; payment?: string }>;
}) {
  return <LoginPageShell searchParams={searchParams} forceLocale="en" />;
}
