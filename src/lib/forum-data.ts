import { prisma } from "@/lib/db";
import { getDefaultAvatar } from "@/lib/default-avatar";
import { resolveUserAvatarSrc } from "@/lib/user-avatar";
import type { ForumCategory } from "@/lib/forum-rules";

export type ForumReplyTreeNode<T> = T & { children: ForumReplyTreeNode<T>[] };

export function buildForumReplyTree<T extends { id: string; parentId: string | null }>(replies: readonly T[]) {
  const nodes = new Map<string, ForumReplyTreeNode<T>>();
  for (const reply of replies) nodes.set(reply.id, { ...reply, children: [] });
  const roots: ForumReplyTreeNode<T>[] = [];
  for (const reply of replies) {
    const node = nodes.get(reply.id)!;
    if (!reply.parentId) roots.push(node);
    else nodes.get(reply.parentId)?.children.push(node);
  }
  return roots;
}

async function safeAuthor<T extends { id: string; nickname: string | null; avatar: string | null }>(author: T, locale: "zh" | "en") {
  return {
    ...author,
    displayName: author.nickname?.trim() || (locale === "en" ? "ENHE AI Member" : "ENHE AI 用户"),
    avatar: (await resolveUserAvatarSrc(author.avatar)) || getDefaultAvatar(author.nickname?.trim() || author.id),
  };
}

export async function getForumPosts(category?: ForumCategory, locale: "zh" | "en" = "zh") {
  const posts = await prisma.forumPost.findMany({
    where: { status: "approved", ...(category ? { category } : {}) },
    include: {
      author: { select: { id: true, nickname: true, avatar: true } },
      _count: { select: { likes: true, replies: { where: { status: "approved" } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return Promise.all(posts.map(async (post) => ({ ...post, author: await safeAuthor(post.author, locale) })));
}

export async function getForumPost(postId: string, locale: "zh" | "en" = "zh") {
  const post = await prisma.forumPost.findFirst({
    where: { id: postId, status: "approved" },
    include: {
      author: { select: { id: true, nickname: true, avatar: true } },
      _count: { select: { likes: true } },
    },
  });
  if (!post) return null;
  const replies = await prisma.forumReply.findMany({
    where: { postId, status: "approved" },
    include: {
      author: { select: { id: true, nickname: true, avatar: true } },
      _count: { select: { likes: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const safeReplies = await Promise.all(replies.map(async (reply) => ({ ...reply, author: await safeAuthor(reply.author, locale) })));
  return {
    ...post,
    author: await safeAuthor(post.author, locale),
    replies: buildForumReplyTree(safeReplies),
  };
}
