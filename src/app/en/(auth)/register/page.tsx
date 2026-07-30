import { RegisterPageShell } from "@/app/(auth)/register/page-shell";

export const dynamic = "force-dynamic";

export default function EnglishRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return <RegisterPageShell forceLocale="en" searchParams={searchParams} />;
}
