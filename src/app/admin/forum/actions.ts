"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { buildLocalePath } from "@/lib/seo";
import { forumPostInputSchema } from "@/lib/forum-rules";
import { assertForumAttachmentSelection, forumAttachmentLifetimeMs, readForumAttachmentIds } from "@/lib/forum-media";
import { deleteForumMediaStoredFile } from "@/lib/forum-media-storage";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function refreshForum(postId?: string) {
  revalidatePath("/admin/forum");
  for (const locale of ["zh", "en"] as const) {
    revalidatePath(buildLocalePath("/forum", locale));
    if (postId) revalidatePath(buildLocalePath(`/forum/${encodeURIComponent(postId)}`, locale));
  }
}

export async function moderateForumContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const type = text(formData, "type");
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || (type !== "post" && type !== "reply") || (status !== "approved" && status !== "rejected")) {
    throw new Error("FORUM_INVALID_MODERATION");
  }

  let postId = id;
  if (type === "post") {
    const record = await prisma.forumPost.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!record || record.status !== "pending") throw new Error("FORUM_CONTENT_NOT_PENDING");
    await prisma.forumPost.update({ where: { id }, data: { status } });
  } else {
    const record = await prisma.forumReply.findUnique({ where: { id }, select: { id: true, status: true, postId: true } });
    if (!record || record.status !== "pending") throw new Error("FORUM_CONTENT_NOT_PENDING");
    postId = record.postId;
    await prisma.forumReply.update({ where: { id }, data: { status } });
  }

  await writeAdminAuditLog({
    adminId: admin.id,
    action: `forum.${type}.${status}`,
    targetType: `forum_${type}`,
    targetId: id,
    summary: `${type === "post" ? "Forum post" : "Forum reply"} ${status}.`,
    metadata: { status },
  });
  await refreshForum(postId);
}

export async function resolveForumReportAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("FORUM_INVALID_REPORT");
  await prisma.forumReport.update({ where: { id }, data: { status: "resolved", resolvedAt: new Date() } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "forum.report.resolved",
    targetType: "forum_report",
    targetId: id,
    summary: "Resolved a forum report.",
  });
  await refreshForum();
}

export async function updateForumPostAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("FORUM_INVALID_POST");
  const manageAttachments = text(formData, "manageAttachments") === "true";

  const parsed = forumPostInputSchema.safeParse({
    category: text(formData, "category"),
    title: text(formData, "title"),
    content: text(formData, "content"),
  });
  if (!parsed.success) throw new Error("FORUM_INVALID_POST");

  const existing = await prisma.forumPost.findUnique({
    where: { id },
    select: {
      id: true, category: true, title: true, content: true, coverAttachmentId: true,
      ...(manageAttachments ? { attachments: { where: { discardedAt: null }, select: { id: true, kind: true, fileSize: true, filePath: true, authorId: true, postId: true, replyId: true, discardedAt: true, createdAt: true }, orderBy: { createdAt: "asc" as const } } } : {}),
    },
  });
  if (!existing) throw new Error("FORUM_POST_NOT_FOUND");

  const attachmentIds = manageAttachments ? readForumAttachmentIds(formData, "post") : [];
  const coverAttachmentId = manageAttachments ? text(formData, "coverAttachmentId") || null : null;
  const existingAttachments = manageAttachments ? existing.attachments : [];
  const existingById = new Map(existingAttachments.map((attachment) => [attachment.id, attachment]));
  const newAttachmentIds = attachmentIds.filter((attachmentId) => !existingById.has(attachmentId));
  const uploadedAttachments = newAttachmentIds.length ? await prisma.forumAttachment.findMany({
    where: { id: { in: newAttachmentIds } },
    select: { id: true, authorId: true, kind: true, fileSize: true, postId: true, replyId: true, discardedAt: true, createdAt: true },
  }) : [];
  if (manageAttachments && newAttachmentIds.length) assertForumAttachmentSelection(newAttachmentIds, uploadedAttachments, admin.id, "post");
  const uploadedById = new Map(uploadedAttachments.map((attachment) => [attachment.id, attachment]));
  const selectedAttachments = attachmentIds.map((attachmentId) => existingById.get(attachmentId) ?? uploadedById.get(attachmentId));
  if (manageAttachments && selectedAttachments.some((attachment) => !attachment)) throw new Error("FORUM_INVALID_ATTACHMENTS");
  const imageCount = selectedAttachments.filter((attachment) => attachment?.kind === "image").length;
  const videoCount = selectedAttachments.filter((attachment) => attachment?.kind === "video").length;
  if (manageAttachments && (imageCount > 10 || videoCount > 1 || selectedAttachments.some((attachment) => attachment?.kind !== "image" && attachment?.kind !== "video"))) {
    throw new Error("FORUM_INVALID_ATTACHMENTS");
  }
  if (manageAttachments && coverAttachmentId && selectedAttachments.find((attachment) => attachment?.id === coverAttachmentId)?.kind !== "image") {
    throw new Error("FORUM_INVALID_COVER_ATTACHMENT");
  }
  if (manageAttachments) {
    const selectedIds = new Set(attachmentIds);
    const referencedIds = Array.from(parsed.data.content.matchAll(/\[\[media[:=]([a-zA-Z0-9_-]{1,100})\]\]/gu), (match) => match[1]);
    if (referencedIds.some((attachmentId) => !selectedIds.has(attachmentId))) throw new Error("FORUM_INVALID_ATTACHMENTS");
  }
  const removedAttachments = existingAttachments.filter((attachment) => !attachmentIds.includes(attachment.id));
  const retiredAt = new Date();

  if (manageAttachments) {
    await prisma.$transaction(async (tx) => {
      await tx.forumPost.update({ where: { id }, data: { ...parsed.data, coverAttachmentId } });
      if (newAttachmentIds.length) {
        const claimed = await tx.forumAttachment.updateMany({
          where: { id: { in: newAttachmentIds }, authorId: admin.id, postId: null, replyId: null, discardedAt: null, createdAt: { gte: new Date(Date.now() - forumAttachmentLifetimeMs) } },
          data: { postId: id },
        });
        if (claimed.count !== newAttachmentIds.length) throw new Error("FORUM_INVALID_ATTACHMENTS");
      }
      if (removedAttachments.length) {
        const detached = await tx.forumAttachment.updateMany({
          where: { id: { in: removedAttachments.map((attachment) => attachment.id) }, postId: id, discardedAt: null },
          data: { postId: null, discardedAt: retiredAt },
        });
        if (detached.count !== removedAttachments.length) throw new Error("FORUM_INVALID_ATTACHMENTS");
      }
    });
    for (const attachment of removedAttachments) {
      try {
        if (await deleteForumMediaStoredFile(attachment.filePath)) {
          await prisma.forumAttachment.deleteMany({ where: { id: attachment.id, postId: null, discardedAt: retiredAt } });
        }
      } catch {
        // Retired attachments are immediately hidden; expired-media cleanup retries on a later upload.
      }
    }
  } else {
    await prisma.forumPost.update({ where: { id }, data: parsed.data });
  }

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "forum.post.edited",
    targetType: "forum_post",
    targetId: id,
    summary: "Edited a forum post.",
    metadata: {
      category: parsed.data.category,
      titleChanged: existing.title !== parsed.data.title,
      contentChanged: existing.content !== parsed.data.content,
      ...(manageAttachments ? {
        addedAttachmentCount: newAttachmentIds.length,
        removedAttachmentCount: removedAttachments.length,
        coverChanged: existing.coverAttachmentId !== coverAttachmentId,
      } : {}),
    },
  });
  await refreshForum(id);
  revalidatePath(`/admin/forum/${encodeURIComponent(id)}/edit`);
}
