import { PublicSiteChrome } from "@/components/public-site-chrome";
import { ForumNewPostContent } from "@/components/forum/forum-ui";
import { getCurrentUser } from "@/lib/auth";
import { generateForumNewPostMetadata } from "@/lib/forum-seo";

export const generateMetadata = () => generateForumNewPostMetadata("zh");

export default async function NewForumPostPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const [{ submitted }, user] = await Promise.all([searchParams, getCurrentUser()]);
  return <PublicSiteChrome forceLocale="zh"><ForumNewPostContent locale="zh" submitted={submitted === "1"} isAuthenticated={Boolean(user)} /></PublicSiteChrome>;
}
