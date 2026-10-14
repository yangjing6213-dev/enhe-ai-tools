import { notFound } from "next/navigation";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { ForumPostContent } from "@/components/forum/forum-ui";
import { getCurrentUser } from "@/lib/auth";
import { getForumPost } from "@/lib/forum-data";

export default async function ForumPostPage({ params, searchParams }: { params: Promise<{ postId: string }>; searchParams: Promise<{ replySubmitted?: string; reported?: string }> }) {
  const [{ postId }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const post = await getForumPost(postId, "zh");
  if (!post) notFound();
  return <PublicSiteChrome forceLocale="zh"><ForumPostContent locale="zh" post={post} isAuthenticated={Boolean(user)} replySubmitted={query.replySubmitted === "1"} reported={query.reported === "1"} /></PublicSiteChrome>;
}
