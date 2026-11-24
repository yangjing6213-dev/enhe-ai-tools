import { UserOrderHistoryPageShell } from "@/app/user/orders/history-page-shell";

export default function UserOrderHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <UserOrderHistoryPageShell searchParams={searchParams} />;
}
