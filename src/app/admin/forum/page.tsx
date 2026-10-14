import { AdminContentShell, AdminSection } from "@/app/admin/admin-ui";
import { moderateForumContentAction, resolveForumReportAction } from "@/app/admin/forum/actions";
import { prisma } from "@/lib/db";
import { getForumCategoryLabel } from "@/lib/forum-rules";
import { getCurrentLocale } from "@/lib/i18n";

export default async function AdminForumPage() {
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const [posts, replies, reports] = await Promise.all([
    prisma.forumPost.findMany({ where: { status: "pending" }, include: { author: { select: { nickname: true } } }, orderBy: { createdAt: "asc" }, take: 50 }),
    prisma.forumReply.findMany({ where: { status: "pending" }, include: { author: { select: { nickname: true } }, post: { select: { id: true, title: true } } }, orderBy: { createdAt: "asc" }, take: 50 }),
    prisma.forumReport.findMany({ where: { status: "pending" }, include: { reporter: { select: { nickname: true } }, post: { select: { id: true, title: true } }, reply: { select: { id: true, content: true, postId: true } } }, orderBy: { createdAt: "asc" }, take: 50 }),
  ]);
  const title = en ? "Community forum review" : "共创AI论坛审核";
  const approve = en ? "Approve" : "通过";
  const reject = en ? "Reject" : "驳回";
  const empty = en ? "No items are waiting for review." : "目前没有待审核内容。";

  return <AdminSection title={title} intro={en ? "Review discussions and replies before they become public, and resolve user reports." : "帖子和回复通过审核后才会公开；举报处理也在这里完成。"}>
    <AdminContentShell className="enhe-admin-content-management">
      <div className="forum-admin-list">
        {[...posts.map((post) => ({ type: "post" as const, id: post.id, author: post.author.nickname || (en ? "Member" : "用户"), title: post.title, body: post.content, category: getForumCategoryLabel(post.category, locale) })), ...replies.map((reply) => ({ type: "reply" as const, id: reply.id, author: reply.author.nickname || (en ? "Member" : "用户"), title: reply.post.title, body: reply.content, category: en ? "Reply" : "回复" }))].map((item) => (
          <article className="forum-admin-card" key={`${item.type}-${item.id}`}>
            <span className="forum-category-tag">{item.category}</span><h2>{item.title}</h2><p>{item.body}</p><small>{item.author}</small>
            <form action={moderateForumContentAction}>
              <input type="hidden" name="type" value={item.type} /><input type="hidden" name="id" value={item.id} />
              <button name="status" value="approved" type="submit">{approve}</button><button data-status="rejected" name="status" value="rejected" type="submit">{reject}</button>
            </form>
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
