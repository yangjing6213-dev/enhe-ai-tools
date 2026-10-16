"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCurrentLocale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { createAdminAuditCreateData, getAdminAuditRequestContext, writeAdminAuditLog } from "@/lib/admin-audit";
import { assertForumAttachmentSelection, forumAttachmentLifetimeMs, readForumAttachmentIds } from "@/lib/forum-media";
import { deleteForumMediaStoredFile } from "@/lib/forum-media-storage";
import {
  canCreateForumContent,
  canLikeForumContent,
  forumLikeWindowMs,
  forumPostInputSchema,
  forumReplyInputSchema,
  forumReplyMaxDepth,
  forumSubmissionWindowMs,
  getForumReplyDepth,
} from "@/lib/forum-rules";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function forumPath(locale: "zh" | "en", postId?: string) {
  return buildLocalePath(postId ? `/forum/${encodeURIComponent(postId)}` : "/forum", locale);
}

async function revalidateForum(postId?: string) {
  for (const locale of ["zh", "en"] as const) {
    revalidatePath(forumPath(locale));
    if (postId) revalidatePath(forumPath(locale, postId));
  }
}

export async function createForumPostAction(formData: FormData) {
  const user = await requireUser();
  const locale = await getCurrentLocale();
  const parsed = forumPostInputSchema.safeParse({
    category: readText(formData, "category"),
    title: readText(formData, "title"),
    content: readText(formData, "content"),
  });
  if (!parsed.success) throw new Error("FORUM_INVALID_POST");
  const attachmentIds = readForumAttachmentIds(formData, "post");

  const since = new Date(Date.now() - forumSubmissionWindowMs);
  const [posts, replies] = await Promise.all([
    prisma.forumPost.count({ where: { authorId: user.id, createdAt: { gte: since } } }),
    prisma.forumReply.count({ where: { authorId: user.id, createdAt: { gte: since } } }),
  ]);
  if (!canCreateForumContent(posts + replies)) throw new Error("FORUM_SUBMISSION_LIMIT");

  const data = { ...parsed.data, authorId: user.id, status: "approved" as const };
  if (attachmentIds.length) {
    await prisma.$transaction(async (tx) => {
      const where = { id: { in: attachmentIds }, authorId: user.id, postId: null, replyId: null, discardedAt: null, createdAt: { gte: new Date(Date.now() - forumAttachmentLifetimeMs) } };
      const attachments = await tx.forumAttachment.findMany({ where });
      assertForumAttachmentSelection(attachmentIds, attachments, user.id, "post");
      const post = await tx.forumPost.create({ data });
      const claimed = await tx.forumAttachment.updateMany({ where, data: { postId: post.id } });
      if (claimed.count !== attachmentIds.length) throw new Error("FORUM_INVALID_ATTACHMENTS");
    });
  } else {
    await prisma.forumPost.create({ data });
  }
  await revalidateForum();
  redirect(`${buildLocalePath("/forum/new", locale)}?submitted=1`);
}

export async function createForumReplyAction(formData: FormData) {
  const user = await requireUser();
  const locale = await getCurrentLocale();
  const postId = readText(formData, "postId").trim();
  const parentId = readText(formData, "parentId").trim() || null;
  if (!postId) throw new Error("FORUM_INVALID_TARGET");
  const parsed = forumReplyInputSchema.safeParse({ content: readText(formData, "content") });
  if (!parsed.success) throw new Error("FORUM_INVALID_REPLY");
  const attachmentIds = readForumAttachmentIds(formData, "reply");

  const post = await prisma.forumPost.findUnique({ where: { id: postId }, select: { status: true } });
  if (post?.status !== "approved") throw new Error("FORUM_POST_NOT_AVAILABLE");

  let parentDepth = 0;
  if (parentId) {
    let currentId: string | null = parentId;
    let isDirectParent = true;
    while (currentId) {
      const parent: { id: string; postId: string; parentId: string | null; status: string; content: string } | null = await prisma.forumReply.findUnique({
        where: { id: currentId },
        select: { id: true, postId: true, parentId: true, status: true, content: true },
      });
      if (!parent || parent.postId !== postId || parent.status !== "approved") throw new Error("FORUM_PARENT_NOT_AVAILABLE");
      if (isDirectParent && !parent.content.trim()) throw new Error("FORUM_PARENT_NOT_AVAILABLE");
      parentDepth += 1;
      if (parentDepth >= forumReplyMaxDepth) throw new Error("FORUM_REPLY_DEPTH_LIMIT");
      currentId = parent.parentId;
      isDirectParent = false;
    }
  }
  if (getForumReplyDepth(parentDepth) === null) throw new Error("FORUM_REPLY_DEPTH_LIMIT");

  const since = new Date(Date.now() - forumSubmissionWindowMs);
  const [posts, replies] = await Promise.all([
    prisma.forumPost.count({ where: { authorId: user.id, createdAt: { gte: since } } }),
    prisma.forumReply.count({ where: { authorId: user.id, createdAt: { gte: since } } }),
  ]);
  if (!canCreateForumContent(posts + replies)) throw new Error("FORUM_SUBMISSION_LIMIT");

  const data = { ...parsed.data, postId, parentId, authorId: user.id, status: "approved" as const };
  if (attachmentIds.length) {
    await prisma.$transaction(async (tx) => {
      const where = { id: { in: attachmentIds }, authorId: user.id, postId: null, replyId: null, discardedAt: null, createdAt: { gte: new Date(Date.now() - forumAttachmentLifetimeMs) } };
      const attachments = await tx.forumAttachment.findMany({ where });
      assertForumAttachmentSelection(attachmentIds, attachments, user.id, "reply");
      const reply = await tx.forumReply.create({ data });
      const claimed = await tx.forumAttachment.updateMany({ where, data: { replyId: reply.id } });
      if (claimed.count !== attachmentIds.length) throw new Error("FORUM_INVALID_ATTACHMENTS");
    });
  } else {
    await prisma.forumReply.create({ data });
  }
  await revalidateForum(postId);
  redirect(`${forumPath(locale, postId)}?replySubmitted=1#replies`);
}

export async function deleteForumPostAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORUM_POST_DELETE_FORBIDDEN");
  const postId = readText(formData, "postId").trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(postId)) throw new Error("FORUM_INVALID_TARGET");
  const locale = await getCurrentLocale();
  const auditContext = await getAdminAuditRequestContext();

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.forumPost.updateMany({
      where: { id: postId, status: "approved" },
      data: { status: "rejected" },
    });
    if (deleted.count !== 1) throw new Error("FORUM_POST_NOT_AVAILABLE");
    await tx.adminAuditLog.create({ data: createAdminAuditCreateData({
      adminId: user.id,
      action: "forum.post.delete",
      targetType: "forum_post",
      targetId: postId,
      summary: "Soft-deleted a public forum topic and preserved its replies and attachments.",
      metadata: { previousStatus: "approved", status: "rejected" },
    }, auditContext) });
  });

  await revalidateForum(postId);
  revalidatePath("/admin/forum");
  revalidatePath("/sitemap.xml");
  redirect(`${forumPath(locale)}?postDeleted=1`);
}

export async function deleteForumReplyAction(formData: FormData) {
  const user = await requireUser();
  const replyId = z.string().min(1).parse(readText(formData, "replyId").trim());
  const reply = await prisma.forumReply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      postId: true,
      authorId: true,
      status: true,
      content: true,
      post: { select: { status: true } },
      attachments: { where: { discardedAt: null }, select: { id: true, filePath: true } },
    },
  });
  if (!reply || reply.status !== "approved" || reply.post.status !== "approved" || !reply.content.trim()) {
    throw new Error("FORUM_REPLY_NOT_AVAILABLE");
  }

  const isAdmin = user.role === "admin";
  if (!isAdmin && reply.authorId !== user.id) throw new Error("FORUM_REPLY_DELETE_FORBIDDEN");
  const where = { id: reply.id, ...(isAdmin ? {} : { authorId: user.id }), status: "approved" as const };
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.forumReply.updateMany({ where, data: { content: "" } });
    if (deleted.count !== 1) throw new Error("FORUM_REPLY_NOT_AVAILABLE");
    await tx.forumLike.deleteMany({ where: { replyId: reply.id } });
    await tx.forumAttachment.updateMany({
      where: { replyId: reply.id, discardedAt: null },
      data: { discardedAt: now },
    });
  });

  await Promise.all(reply.attachments.map(async (attachment) => {
    try {
      await deleteForumMediaStoredFile(attachment.filePath);
    } catch {
      // The discarded marker blocks public access even if storage cleanup must be retried.
    }
  }));

  if (isAdmin) {
    await writeAdminAuditLog({
      adminId: user.id,
      action: "forum.reply.delete",
      targetType: "forum_reply",
      targetId: reply.id,
      summary: "Soft-deleted a public forum reply.",
      metadata: { postId: reply.postId },
    });
  }
  await revalidateForum(reply.postId);
}

export async function toggleForumLikeAction(formData: FormData) {
  const user = await requireUser();
  const postId = readText(formData, "postId").trim();
  const replyId = readText(formData, "replyId").trim();
  if (Boolean(postId) === Boolean(replyId)) throw new Error("FORUM_INVALID_TARGET");
  const target = postId ? { postId } : { replyId };
  let targetPostId = postId || undefined;
  if (postId) {
    const record = await prisma.forumPost.findUnique({ where: { id: postId }, select: { status: true } });
    if (record?.status !== "approved") throw new Error("FORUM_CONTENT_NOT_AVAILABLE");
  } else {
    const record = await prisma.forumReply.findUnique({ where: { id: replyId }, select: { status: true, postId: true, content: true, post: { select: { status: true } } } });
    if (record?.status !== "approved" || record.post.status !== "approved" || !record.content.trim()) throw new Error("FORUM_CONTENT_NOT_AVAILABLE");
    targetPostId = record.postId;
  }

  const existing = await prisma.forumLike.findFirst({ where: { userId: user.id, ...target }, select: { id: true } });
  if (existing) {
    await prisma.forumLike.deleteMany({ where: { id: existing.id, userId: user.id } });
  } else {
    const since = new Date(Date.now() - forumLikeWindowMs);
    const recent = await prisma.forumLike.count({ where: { userId: user.id, createdAt: { gte: since } } });
    if (!canLikeForumContent(recent)) throw new Error("FORUM_LIKE_LIMIT");
    try {
      await prisma.forumLike.create({ data: { userId: user.id, ...target } });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error;
    }
  }
  await revalidateForum(targetPostId);
  const [ownLike, count] = await Promise.all([
    prisma.forumLike.findFirst({ where: { userId: user.id, ...target }, select: { id: true } }),
    prisma.forumLike.count({ where: target }),
  ]);
  return { liked: Boolean(ownLike), count };
}

export async function setForumBookmarkAction(formData: FormData) {
  const user = await requireUser();
  const postId = readText(formData, "postId").trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(postId)) throw new Error("FORUM_INVALID_TARGET");
  const bookmarked = readText(formData, "bookmarked");
  if (bookmarked !== "true" && bookmarked !== "false") throw new Error("FORUM_INVALID_BOOKMARK_STATE");

  const target = { userId: user.id, postId };
  if (bookmarked === "false") {
    // A member can remove their saved topic even after it leaves the public forum.
    await prisma.forumBookmark.deleteMany({ where: target });
  } else {
    const post = await prisma.forumPost.findUnique({ where: { id: postId }, select: { status: true } });
    if (post?.status !== "approved") throw new Error("FORUM_CONTENT_NOT_AVAILABLE");
    await prisma.forumBookmark.createMany({ data: target, skipDuplicates: true });
  }

  await revalidateForum(postId);
  const [ownBookmark, count] = await Promise.all([
    prisma.forumBookmark.findUnique({ where: { userId_postId: target }, select: { id: true } }),
    prisma.forumBookmark.count({ where: { postId } }),
  ]);
  return { bookmarked: Boolean(ownBookmark), count };
}

export async function recordForumShareAction(formData: FormData) {
  const user = await requireUser();
  const postId = readText(formData, "postId").trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(postId)) throw new Error("FORUM_INVALID_TARGET");
  const post = await prisma.forumPost.findUnique({ where: { id: postId }, select: { status: true } });
  if (post?.status !== "approved") throw new Error("FORUM_CONTENT_NOT_AVAILABLE");

  // The client calls this only after its native share or clipboard operation succeeds.
  await prisma.forumShare.createMany({ data: { userId: user.id, postId }, skipDuplicates: true });
  await revalidateForum(postId);
  return { count: await prisma.forumShare.count({ where: { postId } }) };
}
