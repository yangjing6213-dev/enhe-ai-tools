import Link from "next/link";
import { notFound } from "next/navigation";
import type { PaymentRefundState } from "@prisma/client";
import {
  processRefundRecordAdminAction,
  recoverStaleRefundDispatchAdminAction,
  resolveAmbiguousRefundAdminAction,
  retryRefundFinalizationAdminAction,
} from "@/app/admin/actions";
import { AdminSection, Field, SubmitButton, inputClass, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import {
  canResolveAmbiguousRefundAsProviderRejected,
  getRefundAdminReviewMode,
} from "@/lib/admin-refund-state";
import { zpayRefundDispatchStaleAfterMs } from "@/lib/refund-execution";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getRefundBenefitUsageScopes, getRefundRecordActorLabel } from "@/lib/order-rules";
import { getStatusLabel, orderStatusLabels, refundStatusLabels } from "@/lib/status-labels";
import { formatCurrency } from "@/lib/utils";

const copy = {
  zh: {
    title: "售后/退款详情",
    intro: "查看退款申请、保存退款凭证，并在确认退款后同步撤销相关软件购买权益。",
    back: "返回售后/退款",
    viewOrder: "查看订单",
    processed: "退款处理结果已保存，权益已按所选状态同步。",
    recovered: "超时的供应商请求已转为结果不明确，请立即到支付供应商后台核验。",
    orderNumber: "订单号",
    orderStatus: "订单状态",
    refundStatus: "退款状态",
    user: "用户",
    item: "项目",
    refundAmount: "退款金额",
    createdBy: "创建来源",
    createdAt: "创建时间",
    completedAt: "完成时间",
    paymentRefundState: "支付退款阶段",
    refundRequestedAt: "发起退款时间",
    refundDispatchStartedAt: "供应商请求开始时间",
    refundProviderRespondedAt: "供应商响应时间",
    refundedAt: "本地最终化时间",
    lastErrorCode: "最近错误码",
    lastErrorDetail: "最近错误详情",
    reason: "原因",
    receiverInfo: "收款码 / 收款信息",
    refundProof: "退款凭证",
    reviewNote: "处理备注",
    orderItem: "历史订单项目",
    notSubmitted: "未提交",
    entitlementTitle: "权益二次核查",
    entitlementStats: "下载记录：{downloadCount}。AI账号服务使用记录：{usageCount}。已创建付费巡检：{seoAuditRunCount}。",
    entitlementStatsUnavailable: "订单权益关联异常，无法自动核验使用记录，请先人工检查订单与产品绑定。",
    entitlementWarning: "如果状态改为已退款，系统会撤销该订单关联的软件购买权益。",
    proofUrl: "退款凭证 URL",
    refundConfirmation: "ZPAY 一次性退款确认值",
    proofPlaceholder: "退款截图、转账回执或交易流水 URL",
    providerRefundReference: "ZPAY 退款流水号",
    providerRefundReferencePlaceholder: "供应商后台显示的退款流水号",
    noteLabel: "处理备注",
    notePlaceholder: "退款流水号、沟通记录或驳回原因",
    markRefunded: "确认退款并撤销权益",
    rejectRefund: "驳回退款",
    resolveSucceeded: "确认供应商已退款",
    resolveRejected: "确认供应商未退款",
    retryFinalization: "仅重试本地最终化",
    recoverDispatch: "转为结果不明确",
    dispatchingNotice: "退款请求正在供应商处理中。为避免重复退款，此阶段不能再次发起供应商请求。",
    dispatchingRecoveryNotice: "请求已超过安全等待时间。此操作不会再次请求供应商，只会转入人工核验阶段。",
    ambiguousNotice: "供应商结果不明确。请先到支付供应商后台核对交易，再人工确认实际结果。",
    latePaymentNotice: "本地退款完成后才收到 ZPAY 成功通知。请先在 ZPAY 后台实际退款，并提交退款流水号和凭证后再确认；不能以“供应商未退款”结束流程。",
    finalizationNotice: "供应商已退款，但本地订单和权益尚未完成最终化。此操作不会再次请求供应商。",
    resolutionNotePlaceholder: "必填：供应商后台核验时间、结果和交易凭证编号",
    processing: "处理中...",
    processedReadonly: "该售后/退款记录已经处理，不能再次审核。"
  },
  en: {
    title: "Refund detail",
    intro: "Review the refund request, store refund proof, and revoke related software purchase entitlements when the refund is completed.",
    back: "Back to refunds",
    viewOrder: "View order",
    processed: "Refund decision saved. Entitlements were synchronized according to the selected status.",
    recovered: "The timed-out provider request was moved to ambiguous. Verify it in the provider console now.",
    orderNumber: "Order number",
    orderStatus: "Order status",
    refundStatus: "Refund status",
    user: "User",
    item: "Item",
    refundAmount: "Refund amount",
    createdBy: "Created by",
    createdAt: "Created at",
    completedAt: "Completed at",
    paymentRefundState: "Payment refund stage",
    refundRequestedAt: "Refund requested at",
    refundDispatchStartedAt: "Provider dispatch started at",
    refundProviderRespondedAt: "Provider responded at",
    refundedAt: "Local finalization time",
    lastErrorCode: "Latest error code",
    lastErrorDetail: "Latest error detail",
    reason: "Reason",
    receiverInfo: "Receiver QR / receiver info",
    refundProof: "Refund proof",
    reviewNote: "Review note",
    orderItem: "Legacy order item",
    notSubmitted: "Not submitted",
    entitlementTitle: "Entitlement second check",
    entitlementStats: "Download logs: {downloadCount}. Online usage logs: {usageCount}. Funded audit runs: {seoAuditRunCount}.",
    entitlementStatsUnavailable: "The order entitlement binding is invalid. Review the order and product binding manually.",
    entitlementWarning: "If the status is changed to Refunded, the system revokes the software purchase entitlement related to this order.",
    proofUrl: "Refund proof URL",
    refundConfirmation: "One-use ZPAY refund confirmation",
    proofPlaceholder: "Receipt screenshot, transfer confirmation, or transaction URL",
    providerRefundReference: "ZPAY refund reference",
    providerRefundReferencePlaceholder: "Refund reference shown in the provider console",
    noteLabel: "Review note",
    notePlaceholder: "Refund transaction id, communication note, or rejection reason",
    markRefunded: "Mark refunded and revoke access",
    rejectRefund: "Reject refund",
    resolveSucceeded: "Confirm provider refunded",
    resolveRejected: "Confirm provider did not refund",
    retryFinalization: "Retry local finalization only",
    recoverDispatch: "Move to ambiguous",
    dispatchingNotice: "The provider request is still in flight. A second provider request is disabled to prevent a duplicate refund.",
    dispatchingRecoveryNotice: "The request exceeded the safety window. This action does not call the provider again; it only opens manual reconciliation.",
    ambiguousNotice: "The provider result is ambiguous. Verify the transaction in the provider console before recording the actual result.",
    latePaymentNotice: "ZPAY reported payment after the local refund. Refund it in the ZPAY console, then submit the refund reference and proof before confirming success. This case cannot be closed as provider rejected.",
    finalizationNotice: "The provider refund succeeded, but local order and entitlement finalization is incomplete. This action does not call the provider again.",
    resolutionNotePlaceholder: "Required: verification time, result, and provider transaction evidence",
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
          seoAuditOffer: true,
          toolPurchase: true,
          paymentProof: true,
          paymentTransaction: true,
        }
      }
    }
  });
  if (!refund) notFound();

  const benefitStart = refund.order.activatedAt ?? refund.order.paidAt ?? refund.order.createdAt;
  const benefitUsageScopes = getRefundBenefitUsageScopes({
    orderType: refund.order.orderType,
    orderId: refund.orderId,
    userId: refund.order.userId,
    toolId: refund.order.toolId,
    benefitStart
  });
  const [downloadCount, usageCount, seoAuditRunCount] = await Promise.all([
    benefitUsageScopes.downloadLog
      ? prisma.downloadLog.count({ where: benefitUsageScopes.downloadLog })
      : 0,
    benefitUsageScopes.toolUsageLog
      ? prisma.toolUsageLog.count({ where: benefitUsageScopes.toolUsageLog })
      : 0,
    benefitUsageScopes.seoAuditRun
      ? prisma.seoAuditRun.count({ where: benefitUsageScopes.seoAuditRun })
      : 0
  ]);
  const paymentTransaction = refund.order.paymentTransaction;
  const reviewMode = getRefundAdminReviewMode({
    status: refund.status,
    provider: paymentTransaction?.provider ?? null,
    refundState: paymentTransaction?.refundState ?? null,
  });
  const canResolveAsProviderRejected = canResolveAmbiguousRefundAsProviderRejected(
    paymentTransaction?.refundLastErrorCode,
  );
  const canRecoverDispatch = reviewMode === "dispatching"
    && paymentTransaction?.refundDispatchStartedAt
    && paymentTransaction.refundDispatchStartedAt.getTime()
      < Date.now() - zpayRefundDispatchStaleAfterMs;
  const errorMessage = query.error ? getRefundActionErrorMessage(query.error, locale) : null;

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

      {query.recovered ? (
        <p className="mb-5 rounded-xl border border-[#FFB86B]/30 bg-[#FFB86B]/10 px-4 py-3 text-sm text-[#FFD6A5]">
          {t.recovered}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </p>
      ) : null}

      <div className="glass rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label={t.orderNumber} value={refund.order.orderNo} />
          <Info label={t.orderStatus} value={getStatusLabel(orderStatusLabels, refund.order.orderStatus, locale)} />
          <Info label={t.refundStatus} value={getStatusLabel(refundStatusLabels, refund.status, locale)} />
          <Info label={t.user} value={refund.order.user.email ?? refund.order.user.phone ?? refund.order.user.id} />
          <Info label={t.item} value={refund.order.tool?.name ?? refund.order.seoAuditOffer?.name ?? refund.order.plan?.name ?? t.orderItem} />
          <Info label={t.refundAmount} value={formatCurrency(refund.amount.toString())} />
          <Info label={t.createdBy} value={formatActorLabel({ adminEmail: refund.admin?.email, requesterEmail: refund.requester?.email }, locale)} />
          <Info label={t.createdAt} value={formatDateTime(refund.createdAt, locale)} />
          <Info label={t.completedAt} value={formatDateTime(refund.completedAt, locale)} />
        </div>

        {paymentTransaction ? (
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-3">
            <Info label={t.paymentRefundState} value={getPaymentRefundStateLabel(paymentTransaction.refundState, locale)} />
            <Info label={t.refundRequestedAt} value={formatDateTime(paymentTransaction.refundRequestedAt, locale)} />
            <Info label={t.refundDispatchStartedAt} value={formatDateTime(paymentTransaction.refundDispatchStartedAt, locale)} />
            <Info label={t.refundProviderRespondedAt} value={formatDateTime(paymentTransaction.refundProviderRespondedAt, locale)} />
            <Info label={t.providerRefundReference} value={paymentTransaction.refundProviderReference ?? "-"} />
            <Info label={t.refundedAt} value={formatDateTime(paymentTransaction.refundedAt, locale)} />
            <Info label={t.lastErrorCode} value={paymentTransaction.refundLastErrorCode ?? "-"} />
            {paymentTransaction.refundLastErrorDetail ? (
              <Info label={t.lastErrorDetail} value={paymentTransaction.refundLastErrorDetail} />
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Info label={t.reason} value={refund.reason} />
          <Info label={t.receiverInfo} value={refund.refundReceiverQr ?? t.notSubmitted} />
          <Info label={t.refundProof} value={refund.refundProofImage ?? t.notSubmitted} />
          <Info label={t.reviewNote} value={refund.note ?? "-"} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#FFB86B]/25 bg-[#FFB86B]/10 p-4 text-sm leading-6 text-[#FFD6A5]">
          <p className="font-semibold text-[#FFB86B]">{t.entitlementTitle}</p>
          <p className="mt-2">
            {benefitUsageScopes.isVerifiable
              ? formatEntitlementStats(t.entitlementStats, downloadCount, usageCount, seoAuditRunCount)
              : t.entitlementStatsUnavailable}
          </p>
          <p className="mt-1">{t.entitlementWarning}</p>
        </div>

        {reviewMode === "standard" ? (
          <form action={processRefundRecordAdminAction} className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
            <input type="hidden" name="refundId" value={refund.id} />
            <Field label={t.proofUrl}>
              <input name="refundProofImage" defaultValue={refund.refundProofImage ?? ""} placeholder={t.proofPlaceholder} className={inputClass} />
            </Field>
            <Field label={t.noteLabel}>
              <input name="note" defaultValue={refund.note ?? ""} placeholder={t.notePlaceholder} className={inputClass} />
            </Field>
            <Field label={t.refundConfirmation}>
              <input name="refundConfirmation" type="password" autoComplete="off" className={inputClass} />
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
        ) : reviewMode === "resolve_ambiguous" ? (
          <form action={resolveAmbiguousRefundAdminAction} className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
            <input type="hidden" name="refundId" value={refund.id} />
            <p className="status-warning md:col-span-2">
              {canResolveAsProviderRejected ? t.ambiguousNotice : t.latePaymentNotice}
            </p>
            <Field label={t.noteLabel}>
              <input
                name="note"
                defaultValue={refund.note ?? ""}
                placeholder={t.resolutionNotePlaceholder}
                className={inputClass}
                required
                minLength={2}
              />
            </Field>
            <Field label={t.providerRefundReference}>
              <input
                name="providerRefundReference"
                placeholder={t.providerRefundReferencePlaceholder}
                className={inputClass}
                required={!canResolveAsProviderRejected}
              />
            </Field>
            <Field label={t.proofUrl}>
              <input
                name="refundProofImage"
                defaultValue={refund.refundProofImage ?? ""}
                placeholder={t.proofPlaceholder}
                className={inputClass}
                required={!canResolveAsProviderRejected}
              />
            </Field>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <SubmitButton name="resolution" value="provider_succeeded" variant="success" pendingLabel={t.processing} className="px-5 py-3 text-sm">
                {t.resolveSucceeded}
              </SubmitButton>
              {canResolveAsProviderRejected ? (
                <SubmitButton name="resolution" value="provider_rejected" variant="secondary" pendingLabel={t.processing} className="px-5 py-3 text-sm">
                  {t.resolveRejected}
                </SubmitButton>
              ) : null}
            </div>
          </form>
        ) : reviewMode === "retry_finalization" ? (
          <form action={retryRefundFinalizationAdminAction} className="mt-6 grid gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
            <input type="hidden" name="refundId" value={refund.id} />
            <p className="status-warning md:col-span-2">{t.finalizationNotice}</p>
            <div className="md:col-span-2">
              <SubmitButton variant="success" pendingLabel={t.processing} className="px-5 py-3 text-sm">
                {t.retryFinalization}
              </SubmitButton>
            </div>
          </form>
        ) : reviewMode === "dispatching" ? (
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-6">
            <p className="status-warning">{t.dispatchingNotice}</p>
            {canRecoverDispatch ? (
              <form action={recoverStaleRefundDispatchAdminAction} className="grid gap-3">
                <input type="hidden" name="refundId" value={refund.id} />
                <p className="text-sm text-[#FFD6A5]">{t.dispatchingRecoveryNotice}</p>
                <div>
                  <SubmitButton variant="secondary" pendingLabel={t.processing} className="px-5 py-3 text-sm">
                    {t.recoverDispatch}
                  </SubmitButton>
                </div>
              </form>
            ) : null}
          </div>
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

function formatEntitlementStats(template: string, downloadCount: number, usageCount: number, seoAuditRunCount: number) {
  return template
    .replace("{downloadCount}", String(downloadCount))
    .replace("{usageCount}", String(usageCount))
    .replace("{seoAuditRunCount}", String(seoAuditRunCount));
}

const paymentRefundStateLabels: Record<Locale, Record<PaymentRefundState | "unclaimed", string>> = {
  zh: {
    unclaimed: "尚未发起",
    requested: "等待发起供应商请求",
    dispatching: "供应商请求处理中",
    provider_succeeded: "供应商已退款，待本地最终化",
    finalized: "退款与权益回收已完成",
    finalize_retry: "本地最终化待重试",
    provider_rejected: "供应商拒绝退款",
    ambiguous: "供应商结果不明确，待人工核验",
  },
  en: {
    unclaimed: "Not requested",
    requested: "Awaiting provider dispatch",
    dispatching: "Provider request in progress",
    provider_succeeded: "Provider refunded; local finalization pending",
    finalized: "Refund and entitlement revocation finalized",
    finalize_retry: "Local finalization retry required",
    provider_rejected: "Provider rejected refund",
    ambiguous: "Ambiguous provider result; manual review required",
  },
};

function getPaymentRefundStateLabel(state: PaymentRefundState | null, locale: Locale) {
  return paymentRefundStateLabels[locale][state ?? "unclaimed"];
}

const refundActionErrorMessages: Record<Locale, Record<string, string>> = {
  zh: {
    refund_ambiguous: "供应商退款结果不明确，请先核对供应商后台后再人工确认。",
    refund_already_processing: "退款请求正在处理中，请勿重复提交。",
    refund_finalize_retry: "供应商已退款，但本地最终化失败，请使用“仅重试本地最终化”。",
    refund_execution_failed: "退款执行失败，未确认供应商结果，请核对支付后台。",
    refund_resolution_invalid: "人工核验结果无效，请重新选择。",
    refund_resolution_note_required: "人工核验必须填写供应商后台核验记录。",
    refund_resolution_failed: "人工核验结果保存失败，请刷新状态后重试。",
    refund_finalization_failed: "本地最终化重试失败，请检查错误码后重试。",
    refund_dispatch_recovery_failed: "超时退款请求恢复失败，请刷新页面后重试。",
    refund_dispatch_not_stale: "该退款请求尚未超过安全等待时间，或阶段已经变化。",
    refund_state_mismatch: "退款阶段已经变化，当前操作不再允许，请刷新页面。",
    refund_late_payment_requires_provider_refund: "该订单在本地退款后收到 ZPAY 成功通知，必须先在 ZPAY 后台实际退款，再确认供应商已退款。",
    refund_provider_reference_required: "确认供应商已退款时必须填写 ZPAY 退款流水号。",
    refund_provider_reference_invalid: "ZPAY 退款流水号格式无效，请核对后重试。",
    refund_provider_reference_reused: "该 ZPAY 退款流水号已用于其他订单，不能重复确认。",
    refund_proof_required: "确认供应商已退款时必须提交退款凭证 URL。",
    refund_proof_invalid: "退款凭证 URL 格式无效，请核对后重试。",
  },
  en: {
    refund_ambiguous: "The provider result is ambiguous. Verify it in the provider console before manual reconciliation.",
    refund_already_processing: "The refund is already being processed. Do not submit it again.",
    refund_finalize_retry: "The provider refunded successfully, but local finalization failed. Use the local finalization retry action.",
    refund_execution_failed: "Refund execution failed without a confirmed provider result. Check the provider console.",
    refund_resolution_invalid: "The manual reconciliation result is invalid.",
    refund_resolution_note_required: "A provider-console verification note is required for manual reconciliation.",
    refund_resolution_failed: "The manual reconciliation result could not be saved. Refresh the state and retry.",
    refund_finalization_failed: "Local finalization retry failed. Review the error code before retrying.",
    refund_dispatch_recovery_failed: "The timed-out refund dispatch could not be recovered. Refresh and retry.",
    refund_dispatch_not_stale: "The refund dispatch is not past the safety window, or its state already changed.",
    refund_state_mismatch: "The refund stage changed and this action is no longer allowed. Refresh the page.",
    refund_late_payment_requires_provider_refund: "ZPAY reported payment after the local refund. Refund it in the ZPAY console before confirming provider success.",
    refund_provider_reference_required: "A ZPAY refund reference is required to confirm provider success.",
    refund_provider_reference_invalid: "The ZPAY refund reference is invalid. Verify it and retry.",
    refund_provider_reference_reused: "This ZPAY refund reference is already assigned to another order.",
    refund_proof_required: "A refund proof URL is required to confirm provider success.",
    refund_proof_invalid: "The refund proof URL is invalid. Verify it and retry.",
  },
};

function getRefundActionErrorMessage(code: string, locale: Locale) {
  return refundActionErrorMessages[locale][code]
    ?? (locale === "zh" ? "退款处理失败，请刷新页面并核对当前阶段。" : "Refund processing failed. Refresh the page and verify the current stage.");
}
