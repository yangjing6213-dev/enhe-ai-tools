import Link from "next/link";
import { AdminSection, inputClass, selectClass } from "@/app/admin/admin-ui";
import { buildAdminRefundPageHref, buildAdminRefundWhere, parseAdminRefundListParams } from "@/lib/admin-list";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { refundStatusLabels, getStatusLabel } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";

const refundStatusOptions = ["pending", "completed", "rejected"] as const;

const copy = {
  zh: {
    title: "售后/退款审核",
    intro: "集中审核用户退款申请和后台售后记录。确认退款后，系统会同步撤销相关软件购买授权，并记录完成时间。",
    search: "搜索订单、用户、原因或收款信息",
    allStatus: "全部状态",
    statusOptions: {
      pending: "待处理",
      completed: "已退款",
      rejected: "已驳回"
    },
    filter: "筛选",
    total: "共 {total} 条售后/退款记录，当前第 {page} / {pageCount} 页",
    previous: "上一页",
    next: "下一页",
    order: "订单",
    user: "用户",
    item: "项目",
    amount: "金额",
    status: "状态",
    completedAt: "完成时间",
    action: "操作",
    orderItem: "订单项目",
    review: "审核",
    empty: "暂无售后/退款记录。"
  },
  en: {
    title: "Refund review",
    intro: "Review user refund requests and backend after-sales records. Approved refunds revoke related software purchase entitlements and record completion data.",
    search: "Search order, user, reason, or receiver info",
    allStatus: "All statuses",
    statusOptions: {
      pending: "Pending",
      completed: "Refunded",
      rejected: "Rejected"
    },
    filter: "Filter",
    total: "{total} refund records, page {page} / {pageCount}",
    previous: "Previous",
    next: "Next",
    order: "Order",
    user: "User",
    item: "Item",
    amount: "Amount",
    status: "Status",
    completedAt: "Completed at",
    action: "Action",
    orderItem: "Order item",
    review: "Review",
    empty: "No refund records found."
  }
} as const;

type AdminRefundsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminRefundsPage({ searchParams }: AdminRefundsPageProps) {
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const t = copy[locale];
  const filters = parseAdminRefundListParams(params);
  const where = buildAdminRefundWhere(filters);
  const [refunds, total] = await Promise.all([
    prisma.orderRefundRecord.findMany({
      where,
      include: {
        admin: true,
        requester: true,
        order: { include: { user: true, plan: true, tool: true } }
      },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take
    }),
    prisma.orderRefundRecord.count({ where })
  ]);
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <form className="glass mb-5 grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_220px_auto]" action="/admin/refunds">
        <input name="q" defaultValue={filters.q} placeholder={t.search} className={inputClass} />
        <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
          <option value="">{t.allStatus}</option>
          {refundStatusOptions.map((value) => (
            <option key={value} value={value}>
              {t.statusOptions[value]}
            </option>
          ))}
        </select>
        <button className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#E8EEF8]">{t.filter}</button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8B95A7]">
        <span>{formatTotal(t.total, total, filters.page, pageCount)}</span>
        <div className="flex gap-2">
          <Link
            href={buildAdminRefundPageHref(filters, filters.page - 1)}
            aria-disabled={filters.page <= 1}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.previous}
          </Link>
          <Link
            href={buildAdminRefundPageHref(filters, filters.page + 1)}
            aria-disabled={filters.page >= pageCount}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page >= pageCount ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.next}
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="grid min-w-[1120px] grid-cols-[1.15fr_1fr_0.95fr_0.65fr_0.7fr_0.85fr_0.55fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>{t.order}</span>
          <span>{t.user}</span>
          <span>{t.item}</span>
          <span>{t.amount}</span>
          <span>{t.status}</span>
          <span>{t.completedAt}</span>
          <span className="text-right">{t.action}</span>
        </div>
        <div className="min-w-[1120px] divide-y divide-white/10">
          {refunds.map((refund) => (
            <div key={refund.id} className="grid grid-cols-[1.15fr_1fr_0.95fr_0.65fr_0.7fr_0.85fr_0.55fr] gap-4 px-5 py-4 text-sm transition hover:bg-white/5">
              <Link href={`/admin/orders/${refund.orderId}`} className="font-semibold text-[#E8EEF8] transition hover:text-[#48F5D3]">
                {refund.order.orderNo}
              </Link>
              <span className="truncate text-[#C5D0E2]">{refund.order.user.email ?? refund.order.user.phone ?? refund.order.user.id}</span>
              <span className="truncate text-[#C5D0E2]">{refund.order.plan?.name ?? refund.order.tool?.name ?? t.orderItem}</span>
              <span className="text-[#FFB86B]">{formatCurrency(refund.amount.toString())}</span>
              <span>{getStatusLabel(refundStatusLabels, refund.status, locale)}</span>
              <span className="text-[#8B95A7]">{formatDateTime(refund.completedAt, locale)}</span>
              <span className="text-right">
                <Link href={`/admin/refunds/${refund.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                  {t.review}
                </Link>
              </span>
            </div>
          ))}
          {refunds.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">{t.empty}</div> : null}
        </div>
      </div>
    </AdminSection>
  );
}

function formatTotal(template: string, total: number, page: number, pageCount: number) {
  return template
    .replace("{total}", String(total))
    .replace("{page}", String(page))
    .replace("{pageCount}", String(pageCount));
}

function formatDateTime(value: Date | null, locale: Locale) {
  return value?.toLocaleString(locale === "en" ? "en-US" : "zh-CN") ?? "-";
}
