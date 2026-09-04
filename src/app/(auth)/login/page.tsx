import { LoginPageShell } from "@/app/(auth)/login/page-shell";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; payment?: string }>;
}) {
  return <LoginPageShell searchParams={searchParams} />;
}
