import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { EmojiText } from "@/components/emoji-text";
import { deleteCommentAction, saveAdminCommentReplyAction, updateCommentHomepageDisplayAction, updateCommentPinAction, updateCommentStatusAction } from "@/app/actions";
import { AdminContentShell, SubmitButton, inputClass, selectClass, textareaClass } from "@/app/admin/admin-ui";
import { buildAdminCommentPageHref, buildAdminCommentWhere, parseAdminCommentListParams } from "@/lib/admin-list";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { resolveUserAvatarSrc } from "@/lib/user-avatar";

type AdminCommentsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const copy = {
  zh: {
    title: "评论管理",
    search: "搜索评论、工具、用户",
    allStatus: "全部状态",
    allPinned: "全部置顶",
    pinned: "已置顶",
    notPinned: "未置顶",
    filter: "筛选",
    total: "共 {total} 条评论，当前第 {page} / {pageCount} 页",
    previous: "上一页",
    next: "下一页",
    userFallback: "未知用户",
    noRating: "未评分",
    ratingLabel: (rating: number) => `${rating} 星`,
    approve: "审核通过",
    reject: "驳回",
    delete: "删除",
    pin: "置顶",
    unpin: "取消置顶",
    pinnedSuffix: "已置顶",
    display: "展示",
    hide: "取消展示",
    displayedSuffix: "已展示到首页",
    adminReply: "管理员回复",
    replyPlaceholder: "输入 2 到 1000 个字符的公开回复",
    replyHelp: "保存后会显示在对应产品详情页的评论下方。",
    saveReply: "保存回复",
    approveBeforeReply: "评论审核通过后才能回复。",
    empty: "暂无匹配评论。",
    status: {
      pending: "待审核",
      approved: "审核通过",
      rejected: "已驳回",
      deleted: "已删除"
    }
  },
  en: {
    title: "Comments",
    search: "Search comments, tools, or users",
    allStatus: "All statuses",
    allPinned: "All pin states",
    pinned: "Pinned",
    notPinned: "Not pinned",
    filter: "Filter",
    total: "{total} comments, page {page} / {pageCount}",
    previous: "Previous",
    next: "Next",
    userFallback: "Unknown user",
    noRating: "Not rated",
    ratingLabel: (rating: number) => `${rating} out of 5 stars`,
    approve: "Approve",
    reject: "Reject",
    delete: "Delete",
    pin: "Pin",
    unpin: "Unpin",
    pinnedSuffix: "Pinned",
    display: "Show on home",
    hide: "Hide from home",
    displayedSuffix: "Shown on home",
    adminReply: "Administrator reply",
    replyPlaceholder: "Enter a public reply of 2 to 1000 characters",
    replyHelp: "The reply will appear below this comment on the product detail page.",
    saveReply: "Save reply",
    approveBeforeReply: "Approve this comment before replying.",
    empty: "No matching comments.",
    status: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      deleted: "Deleted"
    }
  }
} as const;

export default async function AdminCommentsPage({ searchParams }: AdminCommentsPageProps) {
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const t = copy[locale];
  const filters = parseAdminCommentListParams(params);
  const where = {
    ...buildAdminCommentWhere(filters),
    ...(filters.status ? {} : { status: { not: "deleted" as const } })
  };
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        tool: { select: { name: true, englishName: true } }
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: filters.skip,
      take: filters.take
    }),
    prisma.comment.count({ where })
  ]);
  const commentsWithAvatarSrc = await Promise.all(
    comments.map(async (comment) => ({
      ...comment,
      avatarSrc: await resolveUserAvatarSrc(comment.user.avatar),
    })),
  );
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <AdminContentShell className="enhe-admin-content-management enhe-admin-comments">
      <h1 className="enhe-admin-title text-3xl font-semibold">{t.title}</h1>

      <form className="enhe-admin-content-form enhe-admin-comment-filter-form glass mt-6 grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_180px_160px_auto]" action="/admin/comments">
        <input name="q" defaultValue={filters.q} placeholder={t.search} className={inputClass} />
        <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
          <option value="">{t.allStatus}</option>
          <option value="pending">{t.status.pending}</option>
          <option value="approved">{t.status.approved}</option>
          <option value="rejected">{t.status.rejected}</option>
          <option value="deleted">{t.status.deleted}</option>
        </select>
        <select name="pinned" defaultValue={filters.pinned === undefined ? "" : String(filters.pinned)} className={selectClass}>
          <option value="">{t.allPinned}</option>
          <option value="true">{t.pinned}</option>
          <option value="false">{t.notPinned}</option>
        </select>
        <button className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#E8EEF8]">{t.filter}</button>
      </form>

      <div className="enhe-admin-content-toolbar mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8B95A7]">
        <span>{formatTotal(t.total, total, filters.page, pageCount)}</span>
        <div className="flex gap-2">
          <Link
            href={buildAdminCommentPageHref(filters, filters.page - 1)}
            aria-disabled={filters.page <= 1}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.previous}
          </Link>
          <Link
            href={buildAdminCommentPageHref(filters, filters.page + 1)}
            aria-disabled={filters.page >= pageCount}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page >= pageCount ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.next}
          </Link>
        </div>
      </div>

      <div className="enhe-admin-comment-list mt-8 space-y-4">
        {commentsWithAvatarSrc.map((comment) => (
          <article key={comment.id} className="enhe-admin-comment-card glass rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  src={comment.avatarSrc}
                  alt=""
                  fallbackSeed={comment.user.id}
                  size={48}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#E8EEF8]"><EmojiText text={comment.user.nickname?.trim() || t.userFallback} /></p>
                  <p className="mt-1 truncate text-sm text-[#8B95A7]" title={locale === "en" ? comment.tool.englishName || comment.tool.name : comment.tool.name}>
                    {locale === "en" ? comment.tool.englishName || comment.tool.name : comment.tool.name}
                  </p>
                </div>
              </div>
              <div className="min-w-fit text-right">
                <p className="text-amber-400" aria-label={comment.rating ? t.ratingLabel(comment.rating) : t.noRating}>
                  {comment.rating ? `${"★".repeat(comment.rating)}${"☆".repeat(5 - comment.rating)}` : t.noRating}
                </p>
                <p className="mt-1 text-xs text-[#8B95A7]">
                  {statusLabel(comment.status, locale)}
                  {comment.isPinned ? ` · ${t.pinnedSuffix}` : ""}
                  {comment.showOnHomepage ? ` · ${t.displayedSuffix}` : ""}
                </p>
              </div>
            </div>
            <p className="mt-3 leading-7"><EmojiText text={comment.content} /></p>
            <form action={saveAdminCommentReplyAction} className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <input type="hidden" name="id" value={comment.id} />
              {comment.status === "approved" ? (
                <>
                  <label htmlFor={`admin-reply-${comment.id}`} className="mb-2 block text-sm font-semibold text-[#E8EEF8]">
                    {t.adminReply}
                  </label>
                  <textarea
                    id={`admin-reply-${comment.id}`}
                    name="reply"
                    required
                    minLength={2}
                    maxLength={1000}
                    defaultValue={comment.adminReply ?? ""}
                    placeholder={t.replyPlaceholder}
                    className={textareaClass}
                  />
                  <p className="mt-2 text-xs text-[#8B95A7]">{t.replyHelp}</p>
                  <SubmitButton pendingLabel={locale === "zh" ? "保存中..." : "Saving..."} className="mt-3 px-5 py-2 text-sm">
                    {t.saveReply}
                  </SubmitButton>
                </>
              ) : (
                <p className="text-sm text-[#8B95A7]">{t.adminReply}：{t.approveBeforeReply}</p>
              )}
            </form>
            <div className="enhe-admin-comment-actions mt-5 flex flex-wrap gap-3">
              <CommentStatusForm id={comment.id} status="approved" label={t.approve} primary />
              <CommentStatusForm id={comment.id} status="rejected" label={t.reject} />
              <form action={deleteCommentAction}>
                <input type="hidden" name="id" value={comment.id} />
                <SubmitButton variant="danger" pendingLabel={locale === "zh" ? "删除中..." : "Deleting..."} className="px-5 py-2 text-sm">{t.delete}</SubmitButton>
              </form>
              {comment.status === "approved" ? (
                <form action={updateCommentHomepageDisplayAction}>
                  <input type="hidden" name="id" value={comment.id} />
                  <input type="hidden" name="showOnHomepage" value={String(!comment.showOnHomepage)} />
                  <SubmitButton
                    variant={comment.showOnHomepage ? "secondary" : "primary"}
                    pendingLabel={locale === "zh" ? "处理中..." : "Processing..."}
                    className="px-5 py-2 text-sm"
                  >
                    {comment.showOnHomepage ? t.hide : t.display}
                  </SubmitButton>
                </form>
              ) : null}
              <form action={updateCommentPinAction}>
                <input type="hidden" name="id" value={comment.id} />
                <input type="hidden" name="isPinned" value={comment.isPinned ? "false" : "true"} />
                <SubmitButton variant="secondary" pendingLabel={locale === "zh" ? "处理中..." : "Processing..."} className="border-[#FFB86B]/40 px-5 py-2 text-sm text-[#FFB86B]">
                  {comment.isPinned ? t.unpin : t.pin}
                </SubmitButton>
              </form>
            </div>
          </article>
        ))}
        {comments.length === 0 ? <div className="enhe-admin-comment-card enhe-admin-comment-empty glass rounded-2xl p-8 text-center text-sm text-[#8B95A7]">{t.empty}</div> : null}
      </div>
    </AdminContentShell>
  );
}

function CommentStatusForm({
  id,
  status,
  label,
  primary = false
}: {
  id: string;
  status: "approved" | "rejected" | "deleted";
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={updateCommentStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={primary ? "success" : "secondary"} pendingLabel="处理中..." className="px-5 py-2 text-sm">
        {label}
      </SubmitButton>
    </form>
  );
}

function statusLabel(status: string, locale: Locale) {
  return copy[locale].status[status as keyof typeof copy.zh.status] ?? status;
}

function formatTotal(template: string, total: number, page: number, pageCount: number) {
  return template
    .replace("{total}", String(total))
    .replace("{page}", String(page))
    .replace("{pageCount}", String(pageCount));
}
