import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getStatusLabel, proofStatusLabels } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";

const copy = {
  zh: {
    title: "支付审核",
    intro: "付款凭证以清单方式展示。点击订单号进入订单详情，点击查看付款记录进入单独审核页。",
    orderNo: "订单号",
    user: "用户",
    item: "项目",
    amount: "金额",
    method: "方式",
    proofStatus: "凭证状态",
    action: "操作",
    orderItem: "订单项目",
    alipay: "支付宝",
    wechat: "微信",
    viewPayment: "查看付款记录",
    empty: "暂无付款凭证。"
  },
  en: {
    title: "Payment review",
    intro: "Payment proofs are listed here. Open the order number for order details, or review a proof on its dedicated page.",
    orderNo: "Order no.",
    user: "User",
    item: "Item",
    amount: "Amount",
    method: "Method",
    proofStatus: "Proof status",
    action: "Action",
    orderItem: "Order item",
    alipay: "Alipay",
    wechat: "WeChat",
    viewPayment: "View payment record",
    empty: "No payment proofs yet."
  }
} as const;

export default async function AdminPaymentsPage() {
  const locale = await getCurrentLocale();
  const t = copy[locale];
  const proofs = await prisma.paymentProof.findMany({
    include: { order: { include: { plan: true, tool: true } }, user: true, reviewer: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold">{t.title}</h1>
      <p className="mt-3 text-sm text-[#8B95A7]">{t.intro}</p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/12 bg-white/6">
        <div className="grid min-w-[1120px] grid-cols-[1.15fr_1fr_0.9fr_0.65fr_0.7fr_0.8fr_0.75fr] items-center gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-[#8B95A7]">
          <span>{t.orderNo}</span>
          <span>{t.user}</span>
          <span>{t.item}</span>
          <span>{t.amount}</span>
          <span>{t.method}</span>
          <span>{t.proofStatus}</span>
          <span className="text-right">{t.action}</span>
        </div>
        <div className="min-w-[1120px] divide-y divide-white/10">
          {proofs.map((proof) => (
            <div key={proof.id} className="grid grid-cols-[1.15fr_1fr_0.9fr_0.65fr_0.7fr_0.8fr_0.75fr] items-center gap-4 px-5 py-4 text-sm transition hover:bg-white/5">
              <Link href={`/admin/orders/${proof.order.id}`} className="font-semibold text-[#E8EEF8] transition hover:text-[#48F5D3]">
                {proof.order.orderNo}
              </Link>
              <span className="truncate text-[#C5D0E2]">{proof.user.email ?? proof.user.phone ?? proof.user.id}</span>
              <span className="truncate text-[#C5D0E2]">{proof.order.plan?.name ?? proof.order.tool?.name ?? t.orderItem}</span>
              <span className="text-[#FFB86B]">{formatCurrency(proof.order.amount.toString())}</span>
              <span>{paymentMethodLabel(proof.paymentMethod, locale)}</span>
              <span className="text-[#FFB86B]">{getStatusLabel(proofStatusLabels, proof.reviewStatus, locale)}</span>
              <span className="flex justify-end">
                <Link href={`/admin/payments/${proof.id}`} className="inline-flex whitespace-nowrap rounded-full border border-white/15 px-4 py-2 text-xs font-semibold leading-none transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
                  {t.viewPayment}
                </Link>
              </span>
            </div>
          ))}
          {proofs.length === 0 ? <div className="px-5 py-10 text-center text-sm text-[#8B95A7]">{t.empty}</div> : null}
        </div>
      </div>
    </div>
  );
}

function paymentMethodLabel(method: string, locale: Locale) {
  if (method === "alipay") return copy[locale].alipay;
  if (method === "wechat") return copy[locale].wechat;
  return method;
}
