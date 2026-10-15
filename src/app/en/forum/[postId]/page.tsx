import { notFound } from "next/navigation";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { ForumPostContent } from "@/components/forum/forum-ui";
import { getCurrentUser } from "@/lib/auth";
import { getForumPost } from "@/lib/forum-data";
import { generateForumPostMetadata } from "@/lib/forum-seo";

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return generateForumPostMetadata("en", postId);
}

export default async function EnglishForumPostPage({ params, searchParams }: { params: Promise<{ postId: string }>; searchParams: Promise<{ replySubmitted?: string }> }) {
  const [{ postId }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const post = await getForumPost(postId, "en", user?.id);
  if (!post) notFound();
  return <PublicSiteChrome forceLocale="en"><ForumPostContent locale="en" post={post} isAuthenticated={Boolean(user)} currentUserId={user?.id} isAdmin={user?.role === "admin"} replySubmitted={query.replySubmitted === "1"} /></PublicSiteChrome>;
}
