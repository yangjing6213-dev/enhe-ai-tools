import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { getCurrentUser } from "@/lib/auth";
import { findChatMembership } from "@/lib/group-chat/service";

export const dynamic = "force-dynamic";

export default async function ChatGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(`/chat/${(await params).groupId}`)}`);
  const { groupId } = await params;
  const member = await findChatMembership(groupId, user.id);
  if (!member) redirect("/chat?status=membership-required");
  return <PublicSiteChrome forceLocale="zh"><ChatRoom groupId={groupId} currentUserId={user.id} /></PublicSiteChrome>;
}
