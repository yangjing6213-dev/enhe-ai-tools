import { PublicSiteChrome } from "@/components/public-site-chrome";
import { ForumIndexContent } from "@/components/forum/forum-ui";
import { getCurrentUser } from "@/lib/auth";
import { getForumPosts } from "@/lib/forum-data";
import { forumCategorySchema } from "@/lib/forum-rules";
import { generateForumIndexMetadata } from "@/lib/forum-seo";

export const generateMetadata = () => generateForumIndexMetadata("en");

export default async function EnglishForumIndexPage({ searchParams }: { searchParams: Promise<{ category?: string; postDeleted?: string }> }) {
  const [{ category: rawCategory, postDeleted }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const parsed = forumCategorySchema.safeParse(rawCategory);
  const category = parsed.success ? parsed.data : undefined;
  const posts = await getForumPosts(category, "en", user?.id);
  return <PublicSiteChrome forceLocale="en"><ForumIndexContent locale="en" posts={posts} selectedCategory={category} isAuthenticated={Boolean(user)} isAdmin={user?.role === "admin"} postDeleted={postDeleted === "1"} /></PublicSiteChrome>;
}
