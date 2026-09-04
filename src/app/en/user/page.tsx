import { UserCenterPageShell } from "@/app/user/page-shell";

export default function EnglishUserCenterPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <UserCenterPageShell searchParams={searchParams} forceLocale="en" />;
}
