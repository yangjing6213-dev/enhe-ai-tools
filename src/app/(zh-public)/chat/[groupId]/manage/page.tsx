import { redirect } from "next/navigation";
import { ChatGroupManager } from "@/components/chat/ChatGroupManager";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { getCurrentUser } from "@/lib/auth";
import { getChatManagerScope } from "@/lib/group-chat/service";

export const dynamic = "force-dynamic";

export default async function ChatGroupManagePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(`/chat/${groupId}/manage`)}`);
  const scope = await getChatManagerScope(groupId, user);
  if (!scope) redirect("/chat?status=manager-required");
  return <PublicSiteChrome forceLocale="zh"><ChatGroupManager groupId={groupId} isSiteAdmin={scope.isSiteAdmin} /></PublicSiteChrome>;
}
