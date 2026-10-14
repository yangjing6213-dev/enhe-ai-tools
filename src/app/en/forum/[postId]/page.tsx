import { notFound } from "next/navigation";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { ForumPostContent } from "@/components/forum/forum-ui";
import { getCurrentUser } from "@/lib/auth";
import { getForumPost } from "@/lib/forum-data";

export default async function EnglishForumPostPage({ params, searchParams }: { params: Promise<{ postId: string }>; searchParams: Promise<{ replySubmitted?: string }> }) {
  const [{ postId }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const post = await getForumPost(postId, "en", user?.id);
  if (!post) notFound();
  return <PublicSiteChrome forceLocale="en"><ForumPostContent locale="en" post={post} isAuthenticated={Boolean(user)} replySubmitted={query.replySubmitted === "1"} /></PublicSiteChrome>;
}
