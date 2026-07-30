import {
  generateLoginPageMetadata,
  LoginPageShell,
} from "@/app/(auth)/login/page-shell";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateLoginPageMetadata("zh");
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; payment?: string; returnTo?: string }>;
}) {
  return <LoginPageShell searchParams={searchParams} />;
}
