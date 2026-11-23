import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminContentShell, AdminSection } from "@/app/admin/admin-ui";
import { updateForumPostAction } from "@/app/admin/forum/actions";
import { ForumMediaDisplay } from "@/components/forum/forum-media-display";
import { RichTextEditor } from "@/components/rich-text-editor";
import { prisma } from "@/lib/db";
import { forumCategorySchema, getForumCategoryLabel } from "@/lib/forum-rules";
import { getCurrentLocale } from "@/lib/i18n";

const mediaSelect = { id: true, kind: true, mimeType: true, originalName: true } as const;

export default async function AdminForumTopicEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, getCurrentLocale()]);
  const post = await prisma.forumPost.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      title: true,
      content: true,
      attachments: { select: mediaSelect, orderBy: { createdAt: "asc" } },
    },
  });
  if (!post) notFound();

  const en = locale === "en";
  const categories = forumCategorySchema.options;
  const title = en ? "Edit forum topic" : "编辑论坛话题";

  return <AdminSection title={title} intro={en ? "Update the topic text and category. Existing images and videos remain attached." : "修改话题文字和分类；已上传的图片、视频附件会保留。"}>
    <AdminContentShell className="enhe-admin-content-management">
      <form className="forum-form-card forum-admin-edit-form" action={updateForumPostAction}>
        <input type="hidden" name="id" value={post.id} />
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
        {post.attachments.length ? <section aria-label={en ? "Existing attachments" : "现有附件"}>
          <h2>{en ? "Existing attachments" : "现有附件（保存时保留）"}</h2>
          <ForumMediaDisplay locale={locale} attachments={post.attachments} />
        </section> : null}
        <div className="forum-admin-edit-actions">
          <button className="forum-primary-button" type="submit">{en ? "Save changes" : "保存修改"}</button>
          <Link className="forum-back-link" href="/admin/forum">{en ? "Back to forum management" : "返回论坛管理"}</Link>
        </div>
      </form>
    </AdminContentShell>
  </AdminSection>;
}
