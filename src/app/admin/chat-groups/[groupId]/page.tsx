import { ChatGroupManager } from "@/components/chat/ChatGroupManager";

export const dynamic = "force-dynamic";

export default async function AdminChatGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return <ChatGroupManager groupId={groupId} isSiteAdmin />;
}
