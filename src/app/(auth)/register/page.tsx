import { RegisterPageShell } from "@/app/(auth)/register/page-shell";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return <RegisterPageShell searchParams={searchParams} />;
}
