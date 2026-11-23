"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { buildLocalePath } from "@/lib/seo";
import { forumPostInputSchema } from "@/lib/forum-rules";

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

  const parsed = forumPostInputSchema.safeParse({
    category: text(formData, "category"),
    title: text(formData, "title"),
    content: text(formData, "content"),
  });
  if (!parsed.success) throw new Error("FORUM_INVALID_POST");

  const existing = await prisma.forumPost.findUnique({
    where: { id },
    select: { id: true, category: true, title: true, content: true },
  });
  if (!existing) throw new Error("FORUM_POST_NOT_FOUND");

  await prisma.forumPost.update({ where: { id }, data: parsed.data });
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
    },
  });
  await refreshForum(id);
  revalidatePath(`/admin/forum/${encodeURIComponent(id)}/edit`);
}
