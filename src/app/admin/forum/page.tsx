import { AdminContentShell, AdminSection } from "@/app/admin/admin-ui";
import { moderateForumContentAction, resolveForumReportAction } from "@/app/admin/forum/actions";
import { prisma } from "@/lib/db";
import { getForumCategoryLabel } from "@/lib/forum-rules";
import { getCurrentLocale } from "@/lib/i18n";
import { ForumMediaDisplay } from "@/components/forum/forum-media-display";
import { EmojiText } from "@/components/emoji-text";

const mediaSelect = { id: true, kind: true, mimeType: true, originalName: true } as const;

export default async function AdminForumPage() {
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const [posts, replies, reports] = await Promise.all([
    prisma.forumPost.findMany({ where: { status: "pending" }, include: { author: { select: { nickname: true } }, attachments: { select: mediaSelect, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" }, take: 50 }),
    prisma.forumReply.findMany({ where: { status: "pending" }, include: { author: { select: { nickname: true } }, post: { select: { id: true, title: true } }, attachments: { select: mediaSelect, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" }, take: 50 }),
    prisma.forumReport.findMany({ where: { status: "pending" }, include: { reporter: { select: { nickname: true } }, post: { select: { id: true, title: true } }, reply: { select: { id: true, content: true, postId: true } } }, orderBy: { createdAt: "asc" }, take: 50 }),
  ]);
  const title = en ? "Community forum review" : "共创AI论坛审核";
  const approve = en ? "Approve" : "通过";
  const reject = en ? "Reject" : "驳回";
  const empty = en ? "No items are waiting for review." : "目前没有待审核内容。";

  return <AdminSection title={title} intro={en ? "Review discussions, replies, images and videos before they become public." : "审核帖子、回复及附加的图片和视频，通过后才会公开。"}>
    <AdminContentShell className="enhe-admin-content-management">
      <div className="forum-admin-list">
        {[...posts.map((post) => ({ type: "post" as const, id: post.id, author: post.author.nickname || (en ? "Member" : "用户"), title: post.title, body: post.content, attachments: post.attachments, category: getForumCategoryLabel(post.category, locale) })), ...replies.map((reply) => ({ type: "reply" as const, id: reply.id, author: reply.author.nickname || (en ? "Member" : "用户"), title: reply.post.title, body: reply.content, attachments: reply.attachments, category: en ? "Reply" : "回复" }))].map((item) => (
          <article className="forum-admin-card" key={`${item.type}-${item.id}`}>
            <span className="forum-category-tag">{item.category}</span><h2><EmojiText text={item.title} /></h2><p><EmojiText text={item.body} /></p><small><EmojiText text={item.author} /></small>
            <ForumMediaDisplay locale={locale} attachments={item.attachments} />
            <div className="forum-moderation-actions">
              {(["approved", "rejected"] as const).map((status) => <form key={status} action={moderateForumContentAction}>
                <input type="hidden" name="type" value={item.type} /><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value={status} />
                <button data-status={status} type="submit">{status === "approved" ? approve : reject}</button>
              </form>)}
            </div>
          </article>
        ))}
        {reports.map((report) => {
          const postId = report.post?.id ?? report.reply?.postId;
          return <article className="forum-admin-card" key={`report-${report.id}`}>
            <span className="forum-category-tag">{en ? "Report" : "举报"}</span>
            <h2>{report.post?.title ?? (report.reply?.content || (en ? "Deleted reply" : "已删除的回复"))}</h2>
            <p>{report.reason}</p><small>{en ? "Reported by" : "举报人："} {report.reporter.nickname || (en ? "Member" : "用户")}</small>
            <form action={resolveForumReportAction}><input type="hidden" name="id" value={report.id} /><button type="submit">{en ? "Resolve report" : "标记已处理"}</button>{postId ? <a className="forum-back-link" href={en ? `/en/forum/${postId}` : `/forum/${postId}`}>{en ? "Open discussion" : "查看话题"}</a> : null}</form>
          </article>;
        })}
        {!posts.length && !replies.length && !reports.length ? <p className="forum-admin-empty">{empty}</p> : null}
      </div>
    </AdminContentShell>
  </AdminSection>;
}
