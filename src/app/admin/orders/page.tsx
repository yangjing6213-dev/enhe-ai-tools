import Link from "next/link";
import { AdminSection, inputClass, selectClass } from "@/app/admin/admin-ui";
import { buildAdminOrderPageHref, buildAdminOrderWhere, parseAdminOrderListParams } from "@/lib/admin-order";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getStatusLabel, orderStatusLabels, proofStatusLabels } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";

type AdminOrdersPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const copy = {
  zh: {
    title: "订单管理",
    intro: "订单记录以清单方式展示，点击查看详情后再编辑状态、处理退款、查看付款记录或删除订单。软件权益开通必须通过支付审核完成。",
    deleted: "订单已删除。",
    refundSaved: "售后/退款记录已保存。",
    search: "搜索订单号、用户、套餐或工具",
    allStatus: "全部状态",
    filter: "筛选订单",
    total: "共 {total} 个订单，当前第 {page} / {pageCount} 页",
    previous: "上一页",
    next: "下一页",
    orderNo: "订单号",
    user: "用户",
    item: "项目",
    amount: "金额",
    orderStatus: "订单状态",
    refundDate: "退款日期",
    action: "操作",
    proof: "凭证",
    orderItem: "订单项目",
    viewDetail: "查看详情",
    empty: "暂无匹配订单。",
    statusOptions: {
      pending_payment: "待支付",
      pending_review: "待审核",
      paid: "已支付",
      activated: "已开通",
      rejected: "审核失败",
      cancelled: "已取消",
      refunded: "已退款"
    }
  },
  en: {
    title: "Orders",
    intro: "Orders are listed here. Open a detail page to edit status, process refunds, view payment records, or delete an order. Software access must be activated through payment review.",
    deleted: "Order deleted.",
    refundSaved: "After-sales/refund record saved.",
    search: "Search order no., user, plan, or tool",
    allStatus: "All statuses",
    filter: "Filter orders",
    total: "{total} orders, page {page} / {pageCount}",
    previous: "Previous",
    next: "Next",
    orderNo: "Order no.",
    user: "User",
    item: "Item",
    amount: "Amount",
    orderStatus: "Order status",
    refundDate: "Refund date",
    action: "Action",
    proof: "Proof",
    orderItem: "Order item",
    viewDetail: "View details",
    empty: "No matching orders.",
    statusOptions: {
      pending_payment: "Pending payment",
      pending_review: "Pending review",
      paid: "Paid",
      activated: "Activated",
      rejected: "Rejected",
      cancelled: "Cancelled",
      refunded: "Refunded"
    }
  }
} as const;

const orderStatusValues = [
  "pending_payment",
  "pending_review",
  "paid",
  "activated",
  "rejected",
  "cancelled",
  "refunded"
] as const;

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const [params, locale] = await Promise.all([searchParams, getCurrentLocale()]);
  const t = copy[locale];
  const filters = parseAdminOrderListParams(params);
  const where = buildAdminOrderWhere(filters);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: true,
        plan: true,
        tool: true,
        paymentProof: true,
        refundRecords: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take
    }),
    prisma.order.count({ where })
  ]);
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <AdminSection title={t.title} intro={t.intro}>
      {params.error ? (
        <p className="mb-5 rounded-xl border border-[#FFB86B]/30 bg-[#FFB86B]/10 px-4 py-3 text-sm text-[#FFB86B]">{params.error}</p>
      ) : null}
      {params.deleted ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">{t.deleted}</p>
      ) : null}
      {params.refund ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">{t.refundSaved}</p>
      ) : null}

      <form className="glass mb-5 grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_220px_auto]" action="/admin/orders">
        <input name="q" defaultValue={filters.q} placeholder={t.search} className={inputClass} />
        <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
          <option value="">{t.allStatus}</option>
          {orderStatusValues.map((value) => (
            <option key={value} value={value}>{t.statusOptions[value]}</option>
          ))}
        </select>
        <button className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#E8EEF8]">{t.filter}</button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#8B95A7]">
        <span>{formatTotal(t.total, total, filters.page, pageCount)}</span>
        <div className="flex gap-2">
          <Link
            href={buildAdminOrderPageHref(filters, filters.page - 1)}
            aria-disabled={filters.page <= 1}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.previous}
          </Link>
          <Link
            href={buildAdminOrderPageHref(filters, filters.page + 1)}
            aria-disabled={filters.page >= pageCount}
            className={`rounded-full border border-white/12 px-4 py-2 ${filters.page >= pageCount ? "pointer-events-none opacity-40" : ""}`}
          >
            {t.next}
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="grid min-w-[1120px] grid-cols-[1.25fr_1.05fr_0.8fr_0.75fr_0.75fr_0.85fr_0.55fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>{t.orderNo}</span>
          <span>{t.user}</span>
          <span>{t.item}</span>
          <span>{t.amount}</span>
          <span>{t.orderStatus}</span>
          <span>{t.refundDate}</span>
          <span className="text-right">{t.action}</span>
        </div>
        <div className="min-w-[1120px] divide-y divide-white/10">
          {orders.map((order) => (
            <div key={order.id} className="grid grid-cols-[1.25fr_1.05fr_0.8fr_0.75fr_0.75fr_0.85fr_0.55fr] gap-4 px-5 py-4 text-sm transition hover:bg-white/5">
              <div>
                <Link href={`/admin/orders/${order.id}`} className="font-semibold text-[#E8EEF8] transition hover:text-[#48F5D3]">
                  {order.orderNo}
                </Link>
                <p className="mt-1 text-xs text-[#8B95A7]">{t.proof}: {getStatusLabel(proofStatusLabels, order.paymentProof?.reviewStatus, locale)}</p>
              </div>
              <span className="truncate text-[#C5D0E2]">{order.user.email ?? order.user.phone ?? order.user.id}</span>
              <span className="truncate text-[#C5D0E2]">{order.plan?.name ?? order.tool?.name ?? t.orderItem}</span>
              <span className="text-[#FFB86B]">{formatCurrency(order.amount.toString())}</span>
              <span>{getStatusLabel(orderStatusLabels, order.orderStatus, locale)}</span>
              <span className="text-[#8B95A7]">{formatOptionalDateTime(order.refundRecords[0]?.completedAt, locale)}</span>
              <span className="text-right">
                <Link href={`/admin/orders/${order.id}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                  {t.viewDetail}
                </Link>
              </span>
            </div>
          ))}
          {orders.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">{t.empty}</div> : null}
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

function formatOptionalDateTime(value: Date | null | undefined, locale: Locale) {
  if (!value) return "-";
  return value.toLocaleString(locale === "en" ? "en-US" : "zh-CN");
}
