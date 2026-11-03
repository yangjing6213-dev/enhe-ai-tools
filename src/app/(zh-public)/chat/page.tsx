import { redirect } from "next/navigation";
import { ChatHub } from "@/components/chat/ChatHub";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=%2Fchat");
  const { tab } = await searchParams;
  const initialTab = tab === "applications" ? "applications" : "mine";
  return <PublicSiteChrome forceLocale="zh"><ChatHub isSiteAdmin={user.role === "admin"} initialTab={initialTab} /></PublicSiteChrome>;
}
