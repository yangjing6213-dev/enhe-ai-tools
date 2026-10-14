import { PublicSiteChrome } from "@/components/public-site-chrome";
import { ForumNewPostContent } from "@/components/forum/forum-ui";
import { getCurrentUser } from "@/lib/auth";

export default async function EnglishNewForumPostPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const [{ submitted }, user] = await Promise.all([searchParams, getCurrentUser()]);
  return <PublicSiteChrome forceLocale="en"><ForumNewPostContent locale="en" submitted={submitted === "1"} isAuthenticated={Boolean(user)} /></PublicSiteChrome>;
}
