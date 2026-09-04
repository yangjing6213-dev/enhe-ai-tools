import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewPaymentProofAction } from "@/app/actions";
import { AdminSection, SubmitButton, inputClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getPaymentProofImageSrc, isRenderablePaymentProofImage } from "@/lib/payment-proof-image";
import { getStatusLabel, orderStatusLabels, proofStatusLabels } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";

type AdminPaymentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

const copy = {
  zh: {
    title: "付款记录详情",
    intro: "查看付款截图、订单信息和审核状态。审核通过后系统会自动创建对应软件购买授权。",
    back: "返回支付审核",
    orderDetail: "查看订单详情",
    orderNo: "订单号",
    user: "用户",
    item: "项目",
    amount: "金额",
    paymentMethod: "支付方式",
    orderStatus: "订单状态",
    proofStatus: "凭证状态",
    remark: "付款备注",
    reviewer: "审核人",
    orderItem: "订单项目",
    proofPreview: "付款截图预览",
    proofAlt: "付款截图",
    openProof: "打开付款截图",
    reviewPlaceholder: "审核备注 / 驳回原因",
    approve: "通过",
    reject: "驳回",
    alipay: "支付宝",
    wechat: "微信",
    reviewedApproved: "付款审核已通过，系统已同步开通权益。",
    reviewedRejected: "付款审核已驳回，用户会收到站内通知。",
    approving: "通过中...",
    rejecting: "驳回中..."
  },
  en: {
    title: "Payment record",
    intro: "Review the payment screenshot, order information, and proof status. Approval automatically creates the related software purchase authorization.",
    back: "Back to payment review",
    orderDetail: "View order details",
    orderNo: "Order no.",
    user: "User",
    item: "Item",
    amount: "Amount",
    paymentMethod: "Payment method",
    orderStatus: "Order status",
    proofStatus: "Proof status",
    remark: "Payment remark",
    reviewer: "Reviewer",
    orderItem: "Order item",
    proofPreview: "Payment screenshot preview",
    proofAlt: "Payment screenshot",
    openProof: "Open payment screenshot",
    reviewPlaceholder: "Review note / rejection reason",
    approve: "Approve",
    reject: "Reject",
    alipay: "Alipay",
    wechat: "WeChat",
    reviewedApproved: "Payment approved. The related benefits have been activated.",
    reviewedRejected: "Payment rejected. The user has been notified.",
    approving: "Approving...",
    rejecting: "Rejecting..."
  }
} as const;

export default async function AdminPaymentDetailPage({ params, searchParams }: AdminPaymentDetailPageProps) {
  const [{ id }, query, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
  const t = copy[locale];
  const proof = await prisma.paymentProof.findUnique({
    where: { id },
    include: { order: { include: { plan: true, tool: true } }, user: true, reviewer: true }
  });
  if (!proof) notFound();
  const proofImage = getPaymentProofImageSrc(proof);
  const reviewNotice =
    query.review === "approved" ? t.reviewedApproved : query.review === "rejected" ? t.reviewedRejected : null;

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/payments" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          {t.back}
        </Link>
        <Link href={`/admin/orders/${proof.order.id}`} className="rounded-full border border-[#48F5D3]/30 px-4 py-2 text-sm text-[#48F5D3]">
          {t.orderDetail}
        </Link>
      </div>

      {reviewNotice ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm font-semibold text-[#48F5D3]">
          {reviewNotice}
        </p>
      ) : null}

      <div className="glass rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label={t.orderNo} value={proof.order.orderNo} />
          <Info label={t.user} value={proof.user.email ?? proof.user.phone ?? proof.user.id} />
          <Info label={t.item} value={proof.order.plan?.name ?? proof.order.tool?.name ?? t.orderItem} />
          <Info label={t.amount} value={formatCurrency(proof.order.amount.toString())} />
          <Info label={t.paymentMethod} value={paymentMethodLabel(proof.paymentMethod, locale)} />
          <Info label={t.orderStatus} value={getStatusLabel(orderStatusLabels, proof.order.orderStatus, locale)} />
          <Info label={t.proofStatus} value={getStatusLabel(proofStatusLabels, proof.reviewStatus, locale)} />
          <Info label={t.remark} value={proof.paymentRemark ?? "-"} />
          <Info label={t.reviewer} value={proof.reviewer?.email ?? "-"} />
        </div>

        {proofImage ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/8 p-4">
            <p className="mb-3 text-sm text-[#8B95A7]">{t.proofPreview}</p>
            {isRenderablePaymentProofImage(proofImage) ? (
              <Image src={proofImage} alt={t.proofAlt} width={820} height={520} className="max-h-[520px] w-full rounded-xl object-contain" unoptimized />
            ) : (
              <a href={proofImage} target="_blank" rel="nofollow noopener noreferrer" className="break-all text-sm text-[#48F5D3]">{t.openProof}</a>
            )}
          </div>
        ) : null}

        <form action={reviewPaymentProofAction} className="mt-6 grid gap-3 border-t border-white/10 pt-6 md:grid-cols-[1fr_120px_120px]">
          <input type="hidden" name="orderId" value={proof.orderId} />
          <input name="reviewNote" placeholder={t.reviewPlaceholder} className={inputClass} />
          <SubmitButton name="decision" value="approved" variant="success" pendingLabel={t.approving}>
            {t.approve}
          </SubmitButton>
          <SubmitButton name="decision" value="rejected" variant="secondary" pendingLabel={t.rejecting}>
            {t.reject}
          </SubmitButton>
        </form>
      </div>
    </AdminSection>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-[#8B95A7]">{label}</p>
      <p className="mt-2 break-all font-semibold text-[#E8EEF8]">{value}</p>
    </div>
  );
}

function paymentMethodLabel(method: string, locale: Locale) {
  if (method === "alipay") return copy[locale].alipay;
  if (method === "wechat") return copy[locale].wechat;
  return method;
}
