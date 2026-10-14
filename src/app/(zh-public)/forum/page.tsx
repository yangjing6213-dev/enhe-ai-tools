import { PublicSiteChrome } from "@/components/public-site-chrome";
import { ForumIndexContent } from "@/components/forum/forum-ui";
import { getCurrentUser } from "@/lib/auth";
import { getForumPosts } from "@/lib/forum-data";
import { forumCategorySchema } from "@/lib/forum-rules";

export default async function ForumIndexPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category: rawCategory }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const parsed = forumCategorySchema.safeParse(rawCategory);
  const category = parsed.success ? parsed.data : undefined;
  const posts = await getForumPosts(category, "zh", user?.id);
  return <PublicSiteChrome forceLocale="zh"><ForumIndexContent locale="zh" posts={posts} selectedCategory={category} isAuthenticated={Boolean(user)} /></PublicSiteChrome>;
}
