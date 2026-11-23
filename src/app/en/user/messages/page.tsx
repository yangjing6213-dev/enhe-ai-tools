import { NotificationHistoryPageShell } from "@/app/user/messages/history-page-shell";

export default function EnglishUserMessageHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <NotificationHistoryPageShell searchParams={searchParams} forceLocale="en" />;
}
