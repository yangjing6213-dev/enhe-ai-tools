import Link from "next/link";
import { notFound } from "next/navigation";
import { processRefundRecordAdminAction } from "@/app/admin/actions";
import { AdminSection, Field, SubmitButton, inputClass, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getRefundRecordActorLabel } from "@/lib/order-rules";
import { getStatusLabel, orderStatusLabels, refundStatusLabels } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";

const copy = {
  zh: {
    title: "售后/退款详情",
    intro: "查看退款申请、保存退款凭证，并在确认退款后同步撤销相关软件购买权益。",
    back: "返回售后/退款",
    viewOrder: "查看订单",
    processed: "退款处理结果已保存，权益已按所选状态同步。",
    orderNumber: "订单号",
    orderStatus: "订单状态",
    refundStatus: "退款状态",
    user: "用户",
    item: "项目",
    refundAmount: "退款金额",
    createdBy: "创建来源",
    createdAt: "创建时间",
    completedAt: "完成时间",
    reason: "原因",
    receiverInfo: "收款码 / 收款信息",
    refundProof: "退款凭证",
    reviewNote: "处理备注",
    orderItem: "历史订单项目",
    notSubmitted: "未提交",
    entitlementTitle: "权益二次核查",
  entitlementStats: "下载记录：{downloadCount}。AI账号服务使用记录：{usageCount}。",
    entitlementWarning: "如果状态改为已退款，系统会撤销该订单关联的软件购买权益。",
    proofUrl: "退款凭证 URL",
    proofPlaceholder: "退款截图、转账回执或交易流水 URL",
    noteLabel: "处理备注",
    notePlaceholder: "退款流水号、沟通记录或驳回原因",
    markRefunded: "确认退款并撤销权益",
    rejectRefund: "驳回退款",
    processing: "处理中...",
    processedReadonly: "该售后/退款记录已经处理，不能再次审核。"
  },
  en: {
    title: "Refund detail",
    intro: "Review the refund request, store refund proof, and revoke related software purchase entitlements when the refund is completed.",
    back: "Back to refunds",
    viewOrder: "View order",
    processed: "Refund decision saved. Entitlements were synchronized according to the selected status.",
    orderNumber: "Order number",
    orderStatus: "Order status",
    refundStatus: "Refund status",
    user: "User",
    item: "Item",
    refundAmount: "Refund amount",
    createdBy: "Created by",
    createdAt: "Created at",
    completedAt: "Completed at",
    reason: "Reason",
    receiverInfo: "Receiver QR / receiver info",
    refundProof: "Refund proof",
    reviewNote: "Review note",
    orderItem: "Legacy order item",
    notSubmitted: "Not submitted",
    entitlementTitle: "Entitlement second check",
    entitlementStats: "Download logs: {downloadCount}. Online usage logs: {usageCount}.",
    entitlementWarning: "If the status is changed to Refunded, the system revokes the software purchase entitlement related to this order.",
    proofUrl: "Refund proof URL",
    proofPlaceholder: "Receipt screenshot, transfer confirmation, or transaction URL",
    noteLabel: "Review note",
    notePlaceholder: "Refund transaction id, communication note, or rejection reason",
    markRefunded: "Mark refunded and revoke access",
    rejectRefund: "Reject refund",
    processing: "Processing...",
    processedReadonly: "This refund record has already been processed and cannot be reviewed again."
  }
} as const;

type AdminRefundDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminRefundDetailPage({ params, searchParams }: AdminRefundDetailPageProps) {
  const [{ id }, query, locale] = await Promise.all([params, searchParams, getCurrentLocale()]);
  const t = copy[locale];
  const refund = await prisma.orderRefundRecord.findUnique({
    where: { id },
    include: {
      admin: true,
      requester: true,
      order: {
        include: {
          user: true,
          plan: true,
          tool: true,
          toolPurchase: true,
          paymentProof: true
        }
      }
    }
  });
  if (!refund) notFound();

  const scopedToolFilter = refund.order.toolId ? { toolId: refund.order.toolId } : {};
  const [downloadCount, usageCount] = await Promise.all([
    prisma.downloadLog.count({ where: { userId: refund.order.userId, ...scopedToolFilter } }),
    prisma.toolUsageLog.count({ where: { userId: refund.order.userId, ...scopedToolFilter } })
  ]);

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/refunds" className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-[#48F5D3]/50 hover:text-[#48F5D3]">
          {t.back}
        </Link>
        <Link href={`/admin/orders/${refund.orderId}`} className="rounded-full border border-[#48F5D3]/30 px-4 py-2 text-sm text-[#48F5D3]">
          {t.viewOrder}
        </Link>
      </div>

      {query.processed ? (
        <p className="mb-5 rounded-xl border border-[#48F5D3]/30 bg-[#48F5D3]/10 px-4 py-3 text-sm text-[#48F5D3]">
          {t.processed}
        </p>
      ) : null}

      {query.error ? (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {query.error}
        </p>
      ) : null}

      <div className="glass rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label={t.orderNumber} value={refund.order.orderNo} />
          <Info label={t.orderStatus} value={getStatusLabel(orderStatusLabels, refund.order.orderStatus, locale)} />
          <Info label={t.refundStatus} value={getStatusLabel(refundStatusLabels, refund.status, locale)} />
          <Info label={t.user} value={refund.order.user.email ?? refund.order.user.phone ?? refund.order.user.id} />
          <Info label={t.item} value={refund.order.tool?.name ?? t.orderItem} />
          <Info label={t.refundAmount} value={formatCurrency(refund.amount.toString())} />
          <Info label={t.createdBy} value={formatActorLabel({ adminEmail: refund.admin?.email, requesterEmail: refund.requester?.email }, locale)} />
          <Info label={t.createdAt} value={formatDateTime(refund.createdAt, locale)} />
          <Info label={t.completedAt} value={formatDateTime(refund.completedAt, locale)} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Info label={t.reason} value={refund.reason} />
          <Info label={t.receiverInfo} value={refund.refundReceiverQr ?? t.notSubmitted} />
          <Info label={t.refundProof} value={refund.refundProofImage ?? t.notSubmitted} />
          <Info label={t.reviewNote} value={refund.note ?? "-"} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#FFB86B]/25 bg-[#FFB86B]/10 p-4 text-sm leading-6 text-[#FFD6A5]">
          <p className="font-semibold text-[#FFB86B]">{t.entitlementTitle}</p>
          <p className="mt-2">
            {formatEntitlementStats(t.entitlementStats, downloadCount, usageCount)}
          </p>
          <p className="mt-1">{t.entitlementWarning}</p>
        </div>

        {refund.status === "pending" ? (
          <form action={processRefundRecordAdminAction} className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
            <input type="hidden" name="refundId" value={refund.id} />
            <Field label={t.proofUrl}>
              <input name="refundProofImage" placeholder={t.proofPlaceholder} className={inputClass} />
            </Field>
            <Field label={t.noteLabel}>
              <input name="note" placeholder={t.notePlaceholder} className={inputClass} />
            </Field>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <SubmitButton name="status" value="completed" variant="success" pendingLabel={t.processing} className="px-5 py-3 text-sm">
                {t.markRefunded}
              </SubmitButton>
              <SubmitButton name="status" value="rejected" variant="secondary" pendingLabel={t.processing} className="px-5 py-3 text-sm">
                {t.rejectRefund}
              </SubmitButton>
            </div>
          </form>
        ) : (
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
            <Field label={t.proofUrl}>
              <input defaultValue={refund.refundProofImage ?? ""} className={inputClass} disabled />
            </Field>
            <Field label={t.noteLabel}>
              <textarea defaultValue={refund.note ?? ""} className={textareaClass} disabled />
            </Field>
            <div className="text-sm text-[#8B95A7] md:col-span-2">{t.processedReadonly}</div>
          </div>
        )}
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

function formatDateTime(value: Date | null, locale: Locale) {
  return value?.toLocaleString(locale === "en" ? "en-US" : "zh-CN") ?? "-";
}

function formatActorLabel(input: { adminEmail?: string | null; requesterEmail?: string | null }, locale: Locale) {
  if (locale === "en") {
    if (input.adminEmail) return input.adminEmail;
    if (input.requesterEmail) return `User request: ${input.requesterEmail}`;
    return "System record";
  }

  return getRefundRecordActorLabel(input);
}

function formatEntitlementStats(template: string, downloadCount: number, usageCount: number) {
  return template
    .replace("{downloadCount}", String(downloadCount))
    .replace("{usageCount}", String(usageCount));
}
