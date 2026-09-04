import { UserCenterPageShell, type UserCenterSearchParams } from "@/app/user/page-shell";

export default async function UserCenterPage({ searchParams }: { searchParams: UserCenterSearchParams }) {
  return <UserCenterPageShell searchParams={searchParams} />;
}
