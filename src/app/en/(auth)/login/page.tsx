import {
  generateLoginPageMetadata,
  LoginPageShell,
} from "@/app/(auth)/login/page-shell";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateLoginPageMetadata("en");
}

export default function EnglishLoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; payment?: string }>;
}) {
  return <LoginPageShell searchParams={searchParams} forceLocale="en" />;
}
