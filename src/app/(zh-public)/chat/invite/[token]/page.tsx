import { ChatInvite } from "@/components/chat/ChatInvite";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const dynamic = "force-dynamic";

export default async function ChatInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicSiteChrome forceLocale="zh"><ChatInvite token={token} /></PublicSiteChrome>;
}
