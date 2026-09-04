import Link from "next/link";
import { updateCommentPinAction, updateCommentStatusAction } from "@/app/actions";
import { SubmitButton, inputClass, selectClass } from "@/app/admin/admin-ui";
import { buildAdminCommentPageHref, buildAdminCommentWhere, parseAdminCommentListParams } from "@/lib/admin-list";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";

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
    approve: "审核通过",
    reject: "驳回",
    delete: "删除",
    pin: "置顶",
    unpin: "取消置顶",
    pinnedSuffix: "已置顶",
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
    approve: "Approve",
    reject: "Reject",
    delete: "Delete",
    pin: "Pin",
    unpin: "Unpin",
    pinnedSuffix: "Pinned",
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
  const where = buildAdminCommentWhere(filters);
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: { user: true, tool: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: filters.skip,
      take: filters.take
    }),
    prisma.comment.count({ where })
  ]);
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <div>
      <h1 className="text-3xl font-semibold">{t.title}</h1>

      <form className="glass mt-6 grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_180px_160px_auto]" action="/admin/comments">
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8B95A7]">
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

      <div className="mt-8 space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="glass rounded-2xl p-6">
            <p className="text-sm text-[#8B95A7]">
              {comment.tool.name} · {comment.user.email ?? comment.user.phone ?? comment.user.id ?? t.userFallback} · {statusLabel(comment.status, locale)}
              {comment.isPinned ? ` · ${t.pinnedSuffix}` : ""}
            </p>
            <p className="mt-3 leading-7">{comment.content}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CommentStatusForm id={comment.id} status="approved" label={t.approve} primary />
              <CommentStatusForm id={comment.id} status="rejected" label={t.reject} />
              <CommentStatusForm id={comment.id} status="deleted" label={t.delete} />
              <form action={updateCommentPinAction}>
                <input type="hidden" name="id" value={comment.id} />
                <input type="hidden" name="isPinned" value={comment.isPinned ? "false" : "true"} />
                <SubmitButton variant="secondary" pendingLabel={locale === "zh" ? "处理中..." : "Processing..."} className="border-[#FFB86B]/40 px-5 py-2 text-sm text-[#FFB86B]">
                  {comment.isPinned ? t.unpin : t.pin}
                </SubmitButton>
              </form>
            </div>
          </div>
        ))}
        {comments.length === 0 ? <div className="glass rounded-2xl p-8 text-center text-sm text-[#8B95A7]">{t.empty}</div> : null}
      </div>
    </div>
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
