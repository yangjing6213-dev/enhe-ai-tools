import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminContentShell, AdminSection } from "@/app/admin/admin-ui";
import { updateForumPostAction } from "@/app/admin/forum/actions";
import { ForumMediaEditor } from "@/components/forum/forum-media-editor";
import { RichTextEditor } from "@/components/rich-text-editor";
import { prisma } from "@/lib/db";
import { forumCategorySchema, getForumCategoryLabel } from "@/lib/forum-rules";
import { getCurrentLocale } from "@/lib/i18n";

const mediaSelect = { id: true, kind: true, mimeType: true, originalName: true } as const;

export default async function AdminForumTopicEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, locale, query] = await Promise.all([
    params,
    getCurrentLocale(),
    searchParams ?? Promise.resolve({} as Record<string, string | undefined>),
  ]);
  const post = await prisma.forumPost.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      title: true,
      content: true,
      coverAttachmentId: true,
      attachments: { select: mediaSelect, orderBy: { createdAt: "asc" } },
    },
  });
  if (!post) notFound();

  const en = locale === "en";
  const categories = forumCategorySchema.options;
  const title = en ? "Edit forum topic" : "编辑论坛话题";

  return <AdminSection title={title} intro={en ? "Update the topic text, category and attached media." : "修改话题文字、分类及图片附件；你可以添加、移除图片，也可以把图片插入正文。"}>
    <AdminContentShell className="enhe-admin-content-management">
      {query.saved === "1" ? (
        <p role="status" aria-live="polite" className="status-success mb-4">
          {en ? "Topic changes saved." : "话题修改已保存。"}
        </p>
      ) : null}
      <form className="forum-form-card forum-admin-edit-form" action={updateForumPostAction}>
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="manageAttachments" value="true" />
        <label>
          <span>{en ? "Category" : "话题分类"}</span>
          <span className="forum-form-select-control">
            <select name="category" required defaultValue={post.category}>
              {categories.map((category) => <option key={category} value={category}>{getForumCategoryLabel(category, locale)}</option>)}
            </select>
          </span>
        </label>
        <label>
          <span>{en ? "Title" : "标题"}</span>
          <input name="title" required minLength={2} maxLength={120} defaultValue={post.title} />
        </label>
        <label htmlFor="forum-admin-post-content">{en ? "Content" : "内容"}</label>
        <RichTextEditor id="forum-admin-post-content" ariaLabel={en ? "Content" : "内容"} name="content" locale={locale} defaultValue={post.content} required minLength={2} maxLength={5000} />
        <section className="forum-admin-edit-media" aria-label={en ? "Topic images and attachments" : "话题图片和附件"}>
          <h2>{en ? "Topic images and attachments" : "话题图片和附件"}</h2>
          <ForumMediaEditor locale={locale} allowVideo={false} allowCover initialCoverMediaId={post.coverAttachmentId ?? ""} surface="post" initialAttachments={post.attachments} editableExisting />
        </section>
        <div className="forum-admin-edit-actions">
          <button className="forum-primary-button" type="submit">{en ? "Save changes" : "保存修改"}</button>
          <Link className="forum-back-link" href="/admin/forum">{en ? "Back to forum management" : "返回论坛管理"}</Link>
        </div>
      </form>
    </AdminContentShell>
  </AdminSection>;
}
